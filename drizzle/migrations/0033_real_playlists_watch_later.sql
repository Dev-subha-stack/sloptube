CREATE TABLE public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  visibility text NOT NULL DEFAULT 'private',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT playlists_title_length CHECK (char_length(btrim(title)) BETWEEN 1 AND 150),
  CONSTRAINT playlists_description_length CHECK (char_length(description) <= 5000),
  CONSTRAINT playlists_visibility_valid CHECK (visibility IN ('public', 'unlisted', 'private'))
);
CREATE INDEX playlists_owner ON public.playlists (owner_id, updated_at DESC);

CREATE TABLE public.playlist_videos (
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (playlist_id, video_id)
);
CREATE INDEX playlist_videos_order ON public.playlist_videos (playlist_id, position, added_at);

CREATE TABLE public.watch_later (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

GRANT SELECT ON public.playlists TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlists TO authenticated;
GRANT ALL ON public.playlists TO service_role;
GRANT SELECT ON public.playlist_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlist_videos TO authenticated;
GRANT ALL ON public.playlist_videos TO service_role;
GRANT SELECT, INSERT, DELETE ON public.watch_later TO authenticated;
GRANT ALL ON public.watch_later TO service_role;

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_later ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shared playlists are readable" ON public.playlists FOR SELECT TO anon, authenticated
  USING (visibility IN ('public', 'unlisted') OR owner_id = (select auth.uid()));
CREATE POLICY "Owners create playlists" ON public.playlists FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));
CREATE POLICY "Owners edit playlists" ON public.playlists FOR UPDATE TO authenticated
  USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));
CREATE POLICY "Owners delete playlists" ON public.playlists FOR DELETE TO authenticated
  USING (owner_id = (select auth.uid()));

CREATE POLICY "Items of readable playlists are readable" ON public.playlist_videos FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id
                 AND (p.visibility IN ('public', 'unlisted') OR p.owner_id = (select auth.uid()))));
CREATE POLICY "Owners add to their playlists" ON public.playlist_videos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.owner_id = (select auth.uid())));
CREATE POLICY "Owners reorder their playlists" ON public.playlist_videos FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.owner_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.owner_id = (select auth.uid())));
CREATE POLICY "Owners remove from their playlists" ON public.playlist_videos FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.owner_id = (select auth.uid())));

CREATE POLICY "People see their watch later" ON public.watch_later FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "People add to their watch later" ON public.watch_later FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "People remove from their watch later" ON public.watch_later FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

CREATE OR REPLACE FUNCTION public.playlists_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;
CREATE TRIGGER playlists_touch BEFORE UPDATE ON public.playlists FOR EACH ROW EXECUTE FUNCTION public.playlists_touch();

-- A video the caller may watch: ready, not trashed or removed, and public/unlisted or their own.
CREATE OR REPLACE FUNCTION public.video_watchable(v public.videos)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO '' AS $$
  select v.status = 'ready' and v.deleted_at is null and v.removed_at is null
     and (v.visibility in ('public', 'unlisted') or v.owner_id = (select auth.uid()));
$$;

CREATE OR REPLACE FUNCTION public.playlist_cards(pid uuid)
RETURNS TABLE(id uuid, title text, duration_s numeric, thumbnail_url text, hls_key text, preview_sprite_key text,
              published_at timestamptz, views bigint, channel_id uuid, channel_handle text, channel_name text,
              channel_avatar_url text, is_short boolean, item_position integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  select v.id, v.title, v.duration_s, v.thumbnail_url, v.hls_key, v.preview_sprite_key,
         coalesce(v.published_at, v.created_at), v.views, c.id, c.handle, c.name, c.avatar_url, v.is_short, pv.position
    from public.playlist_videos pv
    join public.playlists p on p.id = pv.playlist_id
    join public.videos v on v.id = pv.video_id
    join public.channels c on c.id = v.channel_id
   where pv.playlist_id = pid
     and (p.visibility in ('public', 'unlisted') or p.owner_id = (select auth.uid()))
     and public.video_watchable(v)
   order by pv.position, pv.added_at;
$$;

CREATE OR REPLACE FUNCTION public.watch_later_cards()
RETURNS TABLE(id uuid, title text, duration_s numeric, thumbnail_url text, hls_key text, preview_sprite_key text,
              published_at timestamptz, views bigint, channel_id uuid, channel_handle text, channel_name text,
              channel_avatar_url text, is_short boolean, added_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  select v.id, v.title, v.duration_s, v.thumbnail_url, v.hls_key, v.preview_sprite_key,
         coalesce(v.published_at, v.created_at), v.views, c.id, c.handle, c.name, c.avatar_url, v.is_short, w.added_at
    from public.watch_later w
    join public.videos v on v.id = w.video_id
    join public.channels c on c.id = v.channel_id
   where w.user_id = (select auth.uid()) and public.video_watchable(v)
   order by w.added_at desc;
$$;

-- Playlist lists with the count and the first watchable video, for the cover.
CREATE OR REPLACE FUNCTION public.playlist_summaries(for_owner uuid DEFAULT NULL, only_public boolean DEFAULT false)
RETURNS TABLE(id uuid, owner_id uuid, title text, description text, visibility text, updated_at timestamptz,
              video_count integer, first_video_id uuid, first_thumbnail_url text, first_hls_key text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  select p.id, p.owner_id, p.title, p.description, p.visibility, p.updated_at,
         (select count(*)::int from public.playlist_videos pv join public.videos v on v.id = pv.video_id
           where pv.playlist_id = p.id and public.video_watchable(v)),
         f.id, f.thumbnail_url, f.hls_key
    from public.playlists p
    left join lateral (
      select v.id, v.thumbnail_url, v.hls_key from public.playlist_videos pv join public.videos v on v.id = pv.video_id
       where pv.playlist_id = p.id and public.video_watchable(v)
       order by pv.position, pv.added_at limit 1
    ) f on true
   where p.owner_id = coalesce(for_owner, (select auth.uid()))
     and (case when only_public or p.owner_id <> (select auth.uid()) or (select auth.uid()) is null
               then p.visibility = 'public' else true end)
   order by p.updated_at desc
   limit 200;
$$;

GRANT EXECUTE ON FUNCTION public.playlist_cards(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.playlist_summaries(uuid, boolean) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.watch_later_cards() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.watch_later_cards() TO authenticated;