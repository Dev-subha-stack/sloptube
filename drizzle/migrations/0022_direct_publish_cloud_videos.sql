-- Built-in video storage (no outside encoder): once the browser-compressed MP4
-- is in the "videos" bucket, the server publishes it as is. Service role only.
CREATE OR REPLACE FUNCTION public.direct_publish(video_id uuid, duration_s numeric, width integer, height integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
declare
  v public.videos;
begin
  select * into v from public.videos x where x.id = direct_publish.video_id for update;
  if v.id is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v.status = 'ready' then
    return 'ready';
  end if;
  if v.status not in ('uploaded', 'processing') or v.source_key is null then
    raise exception 'not_uploaded' using errcode = 'P0001';
  end if;

  update public.encode_jobs j
     set status = 'done', progress = 100, error = null, finished_at = now()
   where j.video_id = v.id and j.status in ('queued', 'running');

  update public.videos x
     set status = 'ready',
         duration_s = case when direct_publish.duration_s > 0 then direct_publish.duration_s else x.duration_s end,
         width = coalesce(nullif(direct_publish.width, 0), x.width),
         height = coalesce(nullif(direct_publish.height, 0), x.height),
         hls_key = v.source_key,
         renditions = '[]'::jsonb,
         error = null,
         published_at = case when x.visibility = 'public' then coalesce(x.published_at, now()) else x.published_at end
   where x.id = v.id;
  return 'ready';
end;
$$;
REVOKE ALL ON FUNCTION public.direct_publish(uuid, numeric, integer, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.direct_publish(uuid, numeric, integer, integer) TO service_role;