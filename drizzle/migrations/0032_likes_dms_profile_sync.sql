-- Like notifications ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_video_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
declare
  v public.videos;
  who text;
begin
  if new.kind <> 'like' or (tg_op = 'UPDATE' and old.kind = 'like') then return null; end if;
  select * into v from public.videos x where x.id = new.video_id;
  if v.id is null or v.owner_id = new.user_id then return null; end if;
  if exists (
    select 1 from public.notifications n
     where n.user_id = v.owner_id and n.type = 'like' and n.actor_id = new.user_id
       and n.video_id = v.id and n.comment_id is null and n.created_at > now() - interval '1 day'
  ) then return null; end if;
  select coalesce(nullif(p.display_name, ''), p.username) into who from public.profiles p where p.id = new.user_id;
  insert into public.notifications (user_id, type, message, video_id, actor_id)
  values (v.owner_id, 'like', left(coalesce(who, 'Someone') || ' liked your video "' || v.title || '"', 500), v.id, new.user_id);
  return null;
exception when others then
  return null;
end;
$$;

CREATE TRIGGER video_reactions_notify
AFTER INSERT OR UPDATE OF kind ON public.video_reactions
FOR EACH ROW EXECUTE FUNCTION public.notify_on_video_like();

CREATE OR REPLACE FUNCTION public.notify_on_comment_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
declare
  c public.comments;
  who text;
  snippet text;
begin
  select * into c from public.comments x where x.id = new.comment_id;
  if c.id is null or c.author_id = new.user_id then return null; end if;
  if exists (
    select 1 from public.notifications n
     where n.user_id = c.author_id and n.type = 'like' and n.actor_id = new.user_id
       and n.comment_id = c.id and n.created_at > now() - interval '1 day'
  ) then return null; end if;
  select coalesce(nullif(p.display_name, ''), p.username) into who from public.profiles p where p.id = new.user_id;
  snippet := left(regexp_replace(coalesce(c.body, ''), '\s+', ' ', 'g'), 100);
  insert into public.notifications (user_id, type, message, video_id, actor_id, comment_id)
  values (c.author_id, 'like', left(coalesce(who, 'Someone') || ' liked your comment: ' || snippet, 500), c.video_id, new.user_id, c.id);
  return null;
exception when others then
  return null;
end;
$$;

CREATE TRIGGER comment_likes_notify
AFTER INSERT ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment_like();

-- Profile <-> channel sync --------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_channel_from_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
declare
  next_name text := left(coalesce(nullif(btrim(new.display_name), ''), new.username), 50);
begin
  if new.display_name is distinct from old.display_name then
    update public.channels c set name = next_name where c.owner_id = new.id and c.name is distinct from next_name;
  end if;
  if new.username is distinct from old.username
     and public.channel_handle_is_valid(new.username)
     and not exists (select 1 from public.channels x where lower(x.handle) = lower(new.username) and x.owner_id <> new.id) then
    update public.channels c set handle = new.username
     where c.owner_id = new.id and lower(c.handle) = lower(old.username);
  end if;
  return null;
exception when others then
  return null;
end;
$$;

CREATE TRIGGER on_profile_name_changed
AFTER UPDATE OF display_name, username ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_channel_from_profile();

CREATE OR REPLACE FUNCTION public.sync_profile_from_channel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
begin
  if new.name is distinct from old.name and nullif(btrim(new.name), '') is not null then
    update public.profiles p set display_name = left(new.name, 50)
     where p.id = new.owner_id and p.display_name is distinct from left(new.name, 50);
  end if;
  return null;
exception when others then
  return null;
end;
$$;

CREATE TRIGGER on_channel_name_changed
AFTER UPDATE OF name ON public.channels
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_from_channel();

-- Subscribed channels list --------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_subscribed_channels()
RETURNS TABLE(channel_id uuid, handle text, name text, avatar_url text, description text,
              subscriber_count integer, video_count integer, notify boolean,
              subscribed_at timestamptz, latest_upload_at timestamptz)
LANGUAGE sql STABLE SET search_path TO '' AS $$
  select c.id, c.handle, coalesce(nullif(c.name, ''), c.handle), c.avatar_url, c.description,
         c.subscriber_count,
         (select count(*)::int from public.videos v
           where v.channel_id = c.id and v.visibility = 'public' and v.status = 'ready'
             and v.published_at is not null and v.deleted_at is null and v.removed_at is null),
         s.notify, s.created_at,
         (select max(v.published_at) from public.videos v
           where v.channel_id = c.id and v.visibility = 'public' and v.status = 'ready' and v.deleted_at is null)
    from public.subscriptions s
    join public.channels c on c.id = s.channel_id
   where s.subscriber_id = (select auth.uid())
   order by 3, 1;
$$;
REVOKE ALL ON FUNCTION public.my_subscribed_channels() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_subscribed_channels() TO authenticated;

-- Direct messages -----------------------------------------------------------
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT direct_messages_not_self CHECK (sender_id <> recipient_id),
  CONSTRAINT direct_messages_body_length CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000)
);
CREATE INDEX direct_messages_pair ON public.direct_messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at DESC);
CREATE INDEX direct_messages_unread ON public.direct_messages (recipient_id) WHERE read_at IS NULL;

GRANT SELECT, INSERT ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "People read their own conversations" ON public.direct_messages FOR SELECT TO authenticated
  USING ((select auth.uid()) IN (sender_id, recipient_id));
CREATE POLICY "People send as themselves to active accounts" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid())
    AND read_at IS NULL
    AND EXISTS (select 1 from public.profiles p where p.id = recipient_id and p.onboarded and p.banned_at is null)
  );

CREATE OR REPLACE FUNCTION public.direct_messages_throttle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
begin
  new.created_at := now();
  new.body := btrim(new.body);
  if (select count(*) from public.direct_messages d
       where d.sender_id = new.sender_id and d.created_at > now() - interval '1 minute') >= 20 then
    raise exception 'dm_rate_limited';
  end if;
  return new;
end;
$$;
CREATE TRIGGER direct_messages_throttle BEFORE INSERT ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.direct_messages_throttle();

CREATE OR REPLACE FUNCTION public.dm_mark_read(other uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
declare n integer;
begin
  if auth.uid() is null then return 0; end if;
  update public.direct_messages d set read_at = now()
   where d.recipient_id = auth.uid() and d.sender_id = other and d.read_at is null;
  get diagnostics n = row_count;
  return n;
end;
$$;
REVOKE ALL ON FUNCTION public.dm_mark_read(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dm_mark_read(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.dm_conversations()
RETURNS TABLE(other_id uuid, username text, display_name text, avatar_url text,
              last_body text, last_at timestamptz, last_from_me boolean, unread integer)
LANGUAGE sql STABLE SET search_path TO '' AS $$
  with mine as (
    select d.*, case when d.sender_id = (select auth.uid()) then d.recipient_id else d.sender_id end as other
      from public.direct_messages d
     where (select auth.uid()) in (d.sender_id, d.recipient_id)
  ), last as (
    select distinct on (m.other) m.other, m.body, m.created_at, m.sender_id = (select auth.uid()) as from_me
      from mine m order by m.other, m.created_at desc
  )
  select l.other, p.username, coalesce(nullif(p.display_name, ''), p.username), p.avatar_url,
         left(l.body, 140), l.created_at, l.from_me,
         (select count(*)::int from mine u where u.other = l.other and u.recipient_id = (select auth.uid()) and u.read_at is null)
    from last l join public.profiles p on p.id = l.other
   order by l.created_at desc
   limit 100;
$$;
REVOKE ALL ON FUNCTION public.dm_conversations() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dm_conversations() TO authenticated;

CREATE OR REPLACE FUNCTION public.dm_unread_count()
RETURNS integer LANGUAGE sql STABLE SET search_path TO '' AS $$
  select count(*)::int from public.direct_messages d where d.recipient_id = (select auth.uid()) and d.read_at is null;
$$;
REVOKE ALL ON FUNCTION public.dm_unread_count() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dm_unread_count() TO authenticated;

-- Live updates for the bell and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;