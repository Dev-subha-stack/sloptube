CREATE OR REPLACE FUNCTION public.rate_video(video_id uuid, stars integer)
 RETURNS TABLE(my_stars integer, average numeric, ratings integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  v public.videos;
begin
  if me is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  if rate_video.stars is not null and rate_video.stars not between 1 and 5 then
    raise exception 'bad_stars' using errcode = 'P0001';
  end if;
  select * into v from public.videos x where x.id = rate_video.video_id;
  if v.id is null or v.deleted_at is not null
     or not (v.owner_id = me or (v.status = 'ready' and v.visibility in ('public', 'unlisted'))) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  perform public.engagement_throttle('u:' || me::text, 'react');
  if rate_video.stars is null then
    delete from public.video_ratings r where r.user_id = me and r.video_id = v.id;
  else
    insert into public.video_ratings as r (user_id, video_id, stars)
    values (me, v.id, rate_video.stars)
    on conflict on constraint video_ratings_pkey do update set stars = excluded.stars, updated_at = now()
      where r.stars is distinct from excluded.stars;
  end if;
  return query select * from public.video_rating(v.id);
end;
$function$;