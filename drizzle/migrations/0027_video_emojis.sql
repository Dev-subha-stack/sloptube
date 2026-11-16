CREATE OR REPLACE FUNCTION public.video_emojis(target_video uuid)
 RETURNS TABLE(name text, image_path text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select e.name, e.image_path
  from public.videos v
  join public.channels c on c.id = v.channel_id
  join public.channel_emojis e on e.channel_id = c.id
  where v.id = target_video and c.suspended_at is null
  order by e.name;
$function$;
GRANT EXECUTE ON FUNCTION public.video_emojis(uuid) TO anon, authenticated;