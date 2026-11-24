CREATE INDEX IF NOT EXISTS videos_home_created_idx
  ON public.videos (created_at DESC, id DESC)
  WHERE visibility = 'public' AND status = 'ready';

CREATE OR REPLACE FUNCTION public.home_videos(lim integer DEFAULT 500, exclude_shorts boolean DEFAULT false)
RETURNS TABLE(
  id uuid, title text, duration_s numeric, thumbnail_url text, hls_key text, preview_sprite_key text,
  published_at timestamptz, created_at timestamptz, views bigint,
  channel_id uuid, channel_handle text, channel_name text, channel_avatar_url text,
  is_short boolean, has_thumb boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  select
    v.id, v.title, v.duration_s, v.thumbnail_url, v.hls_key, v.preview_sprite_key,
    coalesce(v.published_at, v.created_at), v.created_at, v.views,
    c.id, c.handle, coalesce(nullif(c.name, ''), c.handle), c.avatar_url,
    v.is_short,
    (v.thumbnail_url is not null or exists (
      select 1 from storage.objects o
      where o.bucket_id = 'videos'
        and o.name = 'uploads/' || v.owner_id::text || '/' || v.id::text || '/thumb-1.webp'
    ))
  from public.videos v
  join public.channels c on c.id = v.channel_id
  where v.visibility = 'public'
    and v.status = 'ready'
    and v.published_at is not null
    and v.deleted_at is null
    and v.removed_at is null
    and not (coalesce(home_videos.exclude_shorts, false) and v.is_short)
  order by v.created_at desc, v.id desc
  limit least(greatest(coalesce(home_videos.lim, 500), 1), 1000);
$$;

REVOKE ALL ON FUNCTION public.home_videos(integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.home_videos(integer, boolean) TO anon, authenticated, service_role;