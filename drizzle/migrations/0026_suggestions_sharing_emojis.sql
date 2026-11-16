-- 1. Suggestions live next to bug reports, told apart by kind.
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'bug';
ALTER TABLE public.bug_reports ADD CONSTRAINT bug_reports_kind_check CHECK (kind IN ('bug', 'idea'));
CREATE INDEX IF NOT EXISTS bug_reports_kind_created_idx ON public.bug_reports (kind, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_bug_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  b public.bug_reports;
  label text;
  what text;
begin
  if tg_table_name = 'bug_report_comments' then
    select * into b from public.bug_reports x where x.id = new.report_id;
    if b.id is not null and b.reporter_id <> new.author_id then
      what := case when b.kind = 'idea' then 'suggestion' else 'bug report' end;
      insert into public.notifications (user_id, type, message, actor_id, bug_report_id)
      values (b.reporter_id, 'bug', left('Staff replied to your ' || what || ' "' || b.title || '"', 500), new.author_id, b.id);
    end if;
  elsif new.status is distinct from old.status then
    what := case when new.kind = 'idea' then 'suggestion' else 'bug report' end;
    label := case
      when new.kind = 'idea' then
        case new.status when 'in_review' then 'is being considered' when 'resolved' then 'was added'
          when 'dismissed' then 'was closed' else 'is pending' end
      else
        case new.status when 'in_review' then 'is being checked' when 'resolved' then 'was fixed'
          when 'dismissed' then 'was closed' else 'is pending' end
      end;
    insert into public.notifications (user_id, type, message, actor_id, bug_report_id)
    values (new.reporter_id, 'bug', left('Your ' || what || ' "' || new.title || '" ' || label, 500), auth.uid(), new.id);
  end if;
  return new;
exception when others then
  return new;
end;
$function$;

-- 2. Private videos shared with people the owner trusts.
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['comment', 'reply', 'like', 'subscribe', 'bug', 'share']));

CREATE TABLE public.video_shares (
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, user_id)
);
CREATE INDEX video_shares_user_idx ON public.video_shares (user_id, created_at DESC);
GRANT SELECT ON public.video_shares TO authenticated;
GRANT ALL ON public.video_shares TO service_role;
ALTER TABLE public.video_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "the person shared with and the owner see a share"
  ON public.video_shares FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR shared_by = (SELECT auth.uid())
  );

CREATE OR REPLACE FUNCTION public.is_shared_with_me(_video_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select (select auth.uid()) is not null and exists (
    select 1 from public.video_shares s where s.video_id = _video_id and s.user_id = (select auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION public.share_video(target_video uuid, person text)
 RETURNS TABLE(shared_user_id uuid, shared_username text, shared_display_name text, shared_avatar_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := auth.uid();
  v public.videos;
  who public.profiles;
  wanted text := lower(btrim(ltrim(btrim(coalesce(person, '')), '@')));
begin
  if me is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  select * into v from public.videos x where x.id = target_video;
  if v.id is null or v.owner_id <> me or v.deleted_at is not null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  select p.* into who from public.profiles p
   where lower(p.username) = wanted
      or p.id = (select c.owner_id from public.channels c where lower(c.handle) = wanted limit 1)
   limit 1;
  if who.id is null or who.banned_at is not null or not who.onboarded then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;
  if who.id = me then raise exception 'not_allowed' using errcode = 'P0001'; end if;
  if (select count(*) from public.video_shares s where s.video_id = v.id) >= 50 then
    raise exception 'too_many' using errcode = 'P0001';
  end if;
  insert into public.video_shares as s (video_id, user_id, shared_by) values (v.id, who.id, me)
  on conflict on constraint video_shares_pkey do nothing;
  if found then
    insert into public.notifications (user_id, type, message, actor_id, video_id)
    values (who.id, 'share', left(coalesce((select coalesce(nullif(p.display_name, ''), p.username) from public.profiles p where p.id = me), 'Someone')
      || ' shared a video with you: "' || v.title || '"', 500), me, v.id);
  end if;
  return query select who.id, who.username, who.display_name, who.avatar_url;
end;
$function$;

CREATE OR REPLACE FUNCTION public.unshare_video(target_video uuid, person_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  delete from public.video_shares s
   where s.video_id = target_video and s.user_id = person_id
     and exists (select 1 from public.videos v where v.id = s.video_id and v.owner_id = auth.uid());
end;
$function$;

CREATE OR REPLACE FUNCTION public.video_shared_with(target_video uuid)
 RETURNS TABLE(shared_user_id uuid, shared_username text, shared_display_name text, shared_avatar_url text, shared_at timestamptz)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p.id, p.username, p.display_name, p.avatar_url, s.created_at
  from public.video_shares s
  join public.videos v on v.id = s.video_id
  join public.profiles p on p.id = s.user_id
  where s.video_id = target_video and v.owner_id = (select auth.uid())
  order by s.created_at desc;
$function$;

CREATE OR REPLACE FUNCTION public.shared_with_me(lim integer DEFAULT 50)
 RETURNS TABLE(id uuid, title text, duration_s numeric, thumbnail_url text, hls_key text, preview_sprite_key text, published_at timestamptz, views bigint, score double precision, channel_id uuid, channel_handle text, channel_name text, channel_avatar_url text, is_short boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select v.id, v.title, v.duration_s, v.thumbnail_url, v.hls_key, v.preview_sprite_key,
         coalesce(v.published_at, s.created_at), v.views, 0::double precision,
         c.id, c.handle, coalesce(nullif(c.name, ''), c.handle), c.avatar_url, v.is_short
  from public.video_shares s
  join public.videos v on v.id = s.video_id
  join public.channels c on c.id = v.channel_id
  where s.user_id = (select auth.uid()) and v.status = 'ready' and v.deleted_at is null and v.removed_at is null
  order by s.created_at desc
  limit least(greatest(coalesce(lim, 50), 1), 100);
$function$;

REVOKE ALL ON FUNCTION public.share_video(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unshare_video(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.video_shared_with(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.shared_with_me(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_video(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unshare_video(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.video_shared_with(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shared_with_me(integer) TO authenticated;

-- Shared people may watch the private video (only once it is ready).
CREATE OR REPLACE FUNCTION public.watch_video(video_id uuid)
 RETURNS TABLE(id uuid, title text, description text, visibility text, status text, is_owner boolean, created_at timestamp with time zone, published_at timestamp with time zone, duration_s numeric, width integer, height integer, views bigint, renditions jsonb, thumbnail_url text, hls_key text, preview_sprite_key text, channel_id uuid, channel_handle text, channel_name text, channel_avatar_url text, channel_subscriber_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    v.id,
    v.title,
    v.description,
    v.visibility,
    v.status,
    mine.yes,
    v.created_at,
    v.published_at,
    v.duration_s,
    v.width,
    v.height,
    v.views,
    case when playable.yes then v.renditions end,
    case when playable.yes then v.thumbnail_url end,
    case when playable.yes then v.hls_key end,
    case when playable.yes then v.preview_sprite_key end,
    c.id,
    c.handle,
    coalesce(nullif(c.name, ''), c.handle),
    c.avatar_url,
    c.subscriber_count
  from public.videos v
  join public.channels c on c.id = v.channel_id
  cross join lateral (select coalesce(v.owner_id = (select auth.uid()), false) as yes) mine
  cross join lateral (select v.status = 'ready' or mine.yes as yes) playable
  where v.id = watch_video.video_id
    and (
      mine.yes
      or v.visibility in ('public', 'unlisted')
      or (v.status = 'ready' and v.deleted_at is null and v.removed_at is null and public.is_shared_with_me(v.id))
    );
$function$;

-- 3. Custom emojis for each channel, used as :name: in comments.
CREATE TABLE public.channel_emojis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (name ~ '^[a-z0-9_]{2,32}$'),
  image_path text NOT NULL CHECK (image_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]{1,16}\.(png|webp)$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, name)
);
GRANT SELECT ON public.channel_emojis TO anon, authenticated;
GRANT INSERT, DELETE ON public.channel_emojis TO authenticated;
GRANT ALL ON public.channel_emojis TO service_role;
ALTER TABLE public.channel_emojis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emojis of active channels are public"
  ON public.channel_emojis FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id AND c.suspended_at IS NULL)
         OR owner_id = (SELECT auth.uid()));
CREATE POLICY "channel owners add their emojis"
  ON public.channel_emojis FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_id AND c.owner_id = (SELECT auth.uid()))
    AND split_part(image_path, '/', 1) = (SELECT auth.uid())::text
  );
CREATE POLICY "channel owners remove their emojis"
  ON public.channel_emojis FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.channel_emojis_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if (select count(*) from public.channel_emojis e where e.channel_id = new.channel_id) >= 50 then
    raise exception 'too_many_emojis' using errcode = 'P0001';
  end if;
  return new;
end;
$function$;
CREATE TRIGGER channel_emojis_limit BEFORE INSERT ON public.channel_emojis
  FOR EACH ROW EXECUTE FUNCTION public.channel_emojis_limit();

CREATE POLICY "emojis: owners can upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'emojis' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "emojis: owners can list their files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'emojis' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "emojis: owners can delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'emojis' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);