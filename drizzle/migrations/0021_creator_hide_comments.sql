ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

-- Hidden comments read like deleted ones to everybody (the creator sees them in Studio).
CREATE OR REPLACE VIEW public.comment_cards WITH (security_invoker = true) AS
 SELECT c.id,
    c.video_id,
    c.parent_id,
    CASE WHEN c.deleted_at IS NULL AND c.hidden_at IS NULL THEN c.body ELSE NULL::text END AS body,
    c.like_count,
    c.reply_count,
    c.pinned AND c.hidden_at IS NULL AS pinned,
    c.hearted AND c.deleted_at IS NULL AND c.hidden_at IS NULL AS hearted,
    c.created_at,
    c.edited_at,
    (c.deleted_at IS NOT NULL OR c.hidden_at IS NOT NULL) AS deleted,
    CASE WHEN c.deleted_at IS NULL AND c.hidden_at IS NULL THEN COALESCE(ch.handle, p.username) ELSE NULL::text END AS author_handle,
    CASE WHEN c.deleted_at IS NULL AND c.hidden_at IS NULL THEN COALESCE(NULLIF(ch.name, ''::text), NULLIF(p.display_name, ''::text), p.username) ELSE NULL::text END AS author_name,
    CASE WHEN c.deleted_at IS NULL AND c.hidden_at IS NULL THEN COALESCE(ch.avatar_url, p.avatar_url) ELSE NULL::text END AS author_avatar_url,
    c.author_id = v.owner_id AND c.deleted_at IS NULL AND c.hidden_at IS NULL AS by_owner,
    c.author_id = (( SELECT auth.uid() AS uid)) AS mine,
    (EXISTS ( SELECT 1 FROM public.comment_likes l WHERE l.comment_id = c.id AND l.user_id = (( SELECT auth.uid() AS uid)))) AS liked,
    c.removed_at IS NOT NULL AS removed,
    c.hidden_at IS NOT NULL AS hidden
   FROM public.comments c
     JOIN public.videos v ON v.id = c.video_id
     JOIN public.profiles p ON p.id = c.author_id
     LEFT JOIN public.channels ch ON ch.owner_id = c.author_id;

-- The creator hides or shows a comment on one of their own videos.
CREATE OR REPLACE FUNCTION public.creator_hide_comment(comment_id uuid, hidden boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  perform public.comment_for_owner(creator_hide_comment.comment_id, me);
  update public.comments c
     set hidden_at = case when creator_hide_comment.hidden then coalesce(c.hidden_at, now()) else null end
   where c.id = creator_hide_comment.comment_id;
end;
$$;
REVOKE ALL ON FUNCTION public.creator_hide_comment(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.creator_hide_comment(uuid, boolean) TO authenticated;

-- Studio: every live comment on the caller's videos, hidden ones included (with their text).
CREATE OR REPLACE FUNCTION public.studio_comments_all(lim integer DEFAULT 100)
RETURNS TABLE(id uuid, video_id uuid, video_title text, parent_id uuid, body text, like_count bigint, reply_count integer, pinned boolean, hearted boolean, created_at timestamptz, edited_at timestamptz, author_handle text, author_name text, author_avatar_url text, by_owner boolean, channel_default text, hidden boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  select
    c.id, c.video_id, v.title, c.parent_id, c.body, c.like_count, c.reply_count, c.pinned, c.hearted,
    c.created_at, c.edited_at,
    coalesce(ch.handle, p.username),
    coalesce(nullif(ch.name, ''), nullif(p.display_name, ''), p.username),
    coalesce(ch.avatar_url, p.avatar_url),
    c.author_id = v.owner_id,
    coalesce((select x.comments_default from public.channels x where x.owner_id = (select auth.uid())), 'on'),
    c.hidden_at is not null
  from public.comments c
  join public.videos v on v.id = c.video_id
  join public.profiles p on p.id = c.author_id
  left join public.channels ch on ch.owner_id = c.author_id
  where v.owner_id = (select auth.uid())
    and c.deleted_at is null
    and public.comments_flag_on((select auth.uid()))
  order by c.created_at desc, c.id desc
  limit least(greatest(coalesce(studio_comments_all.lim, 100), 1), 200);
$$;
REVOKE ALL ON FUNCTION public.studio_comments_all(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.studio_comments_all(integer) TO authenticated;