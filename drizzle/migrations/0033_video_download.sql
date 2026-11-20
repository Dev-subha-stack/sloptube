-- A download URL may only be minted for a ready video its viewer can watch.
-- The application signs the returned source key server-side; the key itself is
-- never returned to a browser request directly.
create or replace function public.video_download_source(video_id uuid)
returns table (source_key text, source_mime text, title text)
language sql
stable
security definer
set search_path = ''
as $$
  select v.source_key, v.source_mime, v.title
    from public.videos v
   where v.id = video_download_source.video_id
     and v.status = 'ready'
     and v.source_key is not null
     and v.deleted_at is null
     and v.removed_at is null
     and (
       v.owner_id = (select auth.uid())
       or v.visibility in ('public', 'unlisted')
     )
   limit 1;
$$;

revoke all on function public.video_download_source(uuid) from public;
grant execute on function public.video_download_source(uuid) to anon, authenticated;
