ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reactions jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.dm_edit(_id uuid, _body text)
RETURNS public.direct_messages
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
declare t text := btrim(coalesce(_body, '')); r public.direct_messages;
begin
  if auth.uid() is null then raise exception 'dm_not_signed_in'; end if;
  if t = '' then raise exception 'dm_empty'; end if;
  if char_length(t) > 2000 then raise exception 'dm_too_long'; end if;
  update public.direct_messages d
     set body = t, edited_at = case when d.body = t then d.edited_at else now() end
   where d.id = _id and d.sender_id = auth.uid() and d.deleted_at is null
  returning d.* into r;
  if r.id is null then raise exception 'dm_not_yours'; end if;
  return r;
end;
$$;

CREATE OR REPLACE FUNCTION public.dm_delete(_id uuid)
RETURNS public.direct_messages
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
declare r public.direct_messages;
begin
  if auth.uid() is null then raise exception 'dm_not_signed_in'; end if;
  update public.direct_messages d
     set body = '', deleted_at = now(), edited_at = null, reactions = '{}'::jsonb
   where d.id = _id and d.sender_id = auth.uid() and d.deleted_at is null
  returning d.* into r;
  if r.id is null then raise exception 'dm_not_yours'; end if;
  return r;
end;
$$;

CREATE OR REPLACE FUNCTION public.dm_react(_id uuid, _emoji text)
RETURNS public.direct_messages
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
declare me uuid := auth.uid(); e text := nullif(btrim(coalesce(_emoji, '')), ''); r public.direct_messages;
begin
  if me is null then raise exception 'dm_not_signed_in'; end if;
  if e is not null and e <> all (array['👍','❤️','😂','😮','😢','🔥']) then raise exception 'dm_bad_reaction'; end if;
  update public.direct_messages d
     set reactions = case when e is null then d.reactions - me::text
                          else d.reactions || jsonb_build_object(me::text, e) end
   where d.id = _id and me in (d.sender_id, d.recipient_id) and d.deleted_at is null
  returning d.* into r;
  if r.id is null then raise exception 'dm_not_found'; end if;
  return r;
end;
$$;

REVOKE ALL ON FUNCTION public.dm_edit(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dm_delete(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dm_react(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dm_edit(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dm_delete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dm_react(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.dm_conversations()
 RETURNS TABLE(other_id uuid, username text, display_name text, avatar_url text, last_body text, last_at timestamp with time zone, last_from_me boolean, unread integer)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with mine as (
    select d.*, case when d.sender_id = (select auth.uid()) then d.recipient_id else d.sender_id end as other
      from public.direct_messages d
     where (select auth.uid()) in (d.sender_id, d.recipient_id)
  ), last as (
    select distinct on (m.other) m.other, m.body, m.deleted_at, m.created_at, m.sender_id = (select auth.uid()) as from_me
      from mine m order by m.other, m.created_at desc
  )
  select l.other, p.username, coalesce(nullif(p.display_name, ''), p.username), p.avatar_url,
         case when l.deleted_at is not null then 'Message deleted' else left(l.body, 140) end, l.created_at, l.from_me,
         (select count(*)::int from mine u where u.other = l.other and u.recipient_id = (select auth.uid()) and u.read_at is null and u.deleted_at is null)
    from last l join public.profiles p on p.id = l.other
   order by l.created_at desc
   limit 100;
$function$;

CREATE OR REPLACE FUNCTION public.dm_unread_count()
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select count(*)::int from public.direct_messages d where d.recipient_id = (select auth.uid()) and d.read_at is null and d.deleted_at is null;
$function$;