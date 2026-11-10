create or replace function public.video_extension_for(mime text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case mime
    when 'video/mp4' then 'mp4'
    when 'video/quicktime' then 'mov'
    when 'video/webm' then 'webm'
    when 'video/x-matroska' then 'mkv'
    else null
  end;
$$;

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  visibility text not null default 'private',
  status text not null default 'uploading',
  source_key text,
  source_bytes bigint,
  source_mime text,
  duration_s numeric,
  width int,
  height int,
  thumbnail_url text,
  hls_key text,
  error text,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint videos_title_length check (char_length(title) between 1 and 100),
  constraint videos_description_length check (char_length(description) <= 5000),
  constraint videos_visibility_valid check (visibility in ('private', 'unlisted', 'public')),
  constraint videos_status_valid check (status in ('uploading', 'uploaded', 'processing', 'ready', 'failed')),
  constraint videos_source_bytes_range check (source_bytes is null or source_bytes between 1 and 2147483648),
  constraint videos_source_mime_valid check (source_mime is null or public.video_extension_for(source_mime) is not null),
  constraint videos_thumbnail_url_https check (thumbnail_url is null or thumbnail_url ~ '^https://')
);

create index if not exists videos_owner_created_idx on public.videos (owner_id, created_at desc);
create index if not exists videos_channel_created_idx on public.videos (channel_id, created_at desc);
create index if not exists videos_public_ready_idx on public.videos (published_at desc)
  where visibility = 'public' and status = 'ready';

drop trigger if exists videos_touch on public.videos;
create trigger videos_touch
  before update on public.videos
  for each row execute function public.touch_updated_at();

alter table public.videos enable row level security;

drop policy if exists "public ready videos are readable by everyone" on public.videos;
create policy "public ready videos are readable by everyone"
  on public.videos
  for select
  to anon, authenticated
  using (visibility = 'public' and status = 'ready');

drop policy if exists "owners read their own videos" on public.videos;
create policy "owners read their own videos"
  on public.videos
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

revoke all on public.videos from anon, authenticated;
grant select on public.videos to anon, authenticated;
grant all on public.videos to service_role;

create or replace function public.upload_flag_on(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.feature_flags f
    where f.key = 'upload'
      and (f.mode = 'everyone' or (f.mode = 'test' and uid = any (f.users)))
  );
$$;

create or replace function public.create_upload(title text, bytes bigint, mime text)
returns table (video_id uuid, source_key text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  me_profile public.profiles;
  my_channel uuid;
  clean_title text := trim(both from coalesce(create_upload.title, ''));
  ext text := public.video_extension_for(create_upload.mime);
  recent int;
  new_id uuid := gen_random_uuid();
  new_key text;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  if not public.upload_flag_on(me) then
    raise exception 'upload_off' using errcode = 'P0001';
  end if;

  select * into me_profile from public.profiles p where p.id = me;
  if me_profile.id is null or not me_profile.onboarded or me_profile.birthdate is null then
    raise exception 'not_onboarded' using errcode = 'P0001';
  end if;
  if public.age_on(me_profile.birthdate) < 13 then
    raise exception 'too_young' using errcode = 'P0001';
  end if;

  select c.id into my_channel from public.channels c where c.owner_id = me;
  if my_channel is null then
    raise exception 'no_channel' using errcode = 'P0001';
  end if;

  if char_length(clean_title) not between 1 and 100 then
    raise exception 'title_invalid' using errcode = 'P0001';
  end if;
  if create_upload.bytes is null or create_upload.bytes < 1 then
    raise exception 'file_empty' using errcode = 'P0001';
  end if;
  if create_upload.bytes > 2147483648 then
    raise exception 'file_too_big' using errcode = 'P0001';
  end if;
  if ext is null then
    raise exception 'bad_type' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('create_upload:' || me::text, 0));
  select count(*) into recent
    from public.videos v
   where v.owner_id = me
     and v.created_at > now() - interval '24 hours';
  if recent >= 10 then
    raise exception 'daily_limit' using errcode = 'P0001';
  end if;

  new_key := 'uploads/' || me::text || '/' || new_id::text || '/source.' || ext;
  insert into public.videos (id, channel_id, owner_id, title, source_key, source_bytes, source_mime)
  values (new_id, my_channel, me, clean_title, new_key, create_upload.bytes, create_upload.mime);

  return query select new_id, new_key;
end;
$$;

create or replace function public.finish_upload(video_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  current_status text;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  select v.status into current_status
    from public.videos v
   where v.id = finish_upload.video_id and v.owner_id = me
   for update;
  if current_status is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if current_status = 'uploaded' then
    return 'uploaded';
  end if;
  if current_status <> 'uploading' then
    raise exception 'not_uploading' using errcode = 'P0001';
  end if;
  update public.videos v
     set status = 'uploaded', error = null
   where v.id = finish_upload.video_id;
  return 'uploaded';
end;
$$;

create or replace function public.abandon_upload(video_id uuid, reason text default 'cancelled')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  current_status text;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  select v.status into current_status
    from public.videos v
   where v.id = abandon_upload.video_id and v.owner_id = me
   for update;
  if current_status is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if current_status = 'failed' then
    return 'failed';
  end if;
  if current_status <> 'uploading' then
    raise exception 'not_uploading' using errcode = 'P0001';
  end if;
  update public.videos v
     set status = 'failed', error = left(coalesce(nullif(trim(both from reason), ''), 'cancelled'), 200)
   where v.id = abandon_upload.video_id;
  return 'failed';
end;
$$;

create or replace function public.update_upload_details(
  video_id uuid,
  title text,
  description text,
  visibility text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  clean_title text := trim(both from coalesce(update_upload_details.title, ''));
  clean_description text := coalesce(update_upload_details.description, '');
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  if char_length(clean_title) not between 1 and 100 then
    raise exception 'title_invalid' using errcode = 'P0001';
  end if;
  if char_length(clean_description) > 5000 then
    raise exception 'description_too_long' using errcode = 'P0001';
  end if;
  if update_upload_details.visibility not in ('private', 'unlisted', 'public') then
    raise exception 'bad_visibility' using errcode = 'P0001';
  end if;
  update public.videos v
     set title = clean_title,
         description = clean_description,
         visibility = update_upload_details.visibility
   where v.id = update_upload_details.video_id and v.owner_id = me;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.create_upload(text, bigint, text) from public, anon;
revoke execute on function public.finish_upload(uuid) from public, anon;
revoke execute on function public.abandon_upload(uuid, text) from public, anon;
revoke execute on function public.update_upload_details(uuid, text, text, text) from public, anon;
grant execute on function public.create_upload(text, bigint, text) to authenticated;
grant execute on function public.finish_upload(uuid) to authenticated;
grant execute on function public.abandon_upload(uuid, text) to authenticated;
grant execute on function public.update_upload_details(uuid, text, text, text) to authenticated;

revoke execute on function public.upload_flag_on(uuid) from public, anon, authenticated;

insert into public.feature_flags (key, label, description, mode)
values (
  'upload',
  'Upload',
  'The /upload page, uploads to R2 and the /studio/videos list.',
  'off'
)
on conflict (key) do nothing;

-- 006 processing

create or replace function public.encode_max_attempts()
returns int
language sql
immutable
set search_path = ''
as $$ select 3 $$;

create or replace function public.encode_stale_after()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '2 hours 15 minutes' $$;

alter table public.videos add column if not exists renditions jsonb;
alter table public.videos add column if not exists preview_sprite_key text;

alter table public.videos drop constraint if exists videos_renditions_array;
alter table public.videos add constraint videos_renditions_array
  check (renditions is null or jsonb_typeof(renditions) = 'array');

create table if not exists public.encode_jobs (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null unique references public.videos (id) on delete cascade,
  status text not null default 'queued',
  attempts int not null default 0,
  worker text,
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  progress int not null default 0,
  created_at timestamptz not null default now(),
  constraint encode_jobs_status_valid check (status in ('queued', 'running', 'done', 'failed')),
  constraint encode_jobs_progress_range check (progress between 0 and 100),
  constraint encode_jobs_attempts_range check (attempts >= 0)
);

create index if not exists encode_jobs_queued_idx on public.encode_jobs (created_at)
  where status = 'queued';
create index if not exists encode_jobs_running_idx on public.encode_jobs (worker)
  where status = 'running';

alter table public.encode_jobs enable row level security;

drop policy if exists "owners read the jobs of their own videos" on public.encode_jobs;
create policy "owners read the jobs of their own videos"
  on public.encode_jobs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.videos v
      where v.id = encode_jobs.video_id and v.owner_id = (select auth.uid())
    )
  );

revoke all on public.encode_jobs from anon, authenticated;
grant select on public.encode_jobs to authenticated;
grant all on public.encode_jobs to service_role;

create or replace function public.queue_encode_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'uploaded' and (tg_op = 'INSERT' or old.status is distinct from 'uploaded') then
    insert into public.encode_jobs (video_id)
    values (new.id)
    on conflict (video_id) do update
      set status = 'queued',
          attempts = 0,
          progress = 0,
          worker = null,
          error = null,
          started_at = null,
          finished_at = null
      where public.encode_jobs.status in ('done', 'failed');
  end if;
  return new;
end;
$$;

drop trigger if exists videos_queue_encode on public.videos;
create trigger videos_queue_encode
  after insert or update of status on public.videos
  for each row execute function public.queue_encode_job();

insert into public.encode_jobs (video_id)
select v.id from public.videos v where v.status = 'uploaded'
on conflict (video_id) do nothing;

create or replace function public.videos_set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.visibility = 'public' and new.status = 'ready' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists videos_published_at on public.videos;
create trigger videos_published_at
  before insert or update of status, visibility on public.videos
  for each row execute function public.videos_set_published_at();

create or replace function public.videos_count_public()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_counted boolean := tg_op <> 'INSERT' and old.visibility = 'public' and old.status = 'ready';
  is_counted boolean := tg_op <> 'DELETE' and new.visibility = 'public' and new.status = 'ready';
begin
  if was_counted and not is_counted then
    update public.channels c set video_count = greatest(c.video_count - 1, 0) where c.id = old.channel_id;
  elsif is_counted and not was_counted then
    update public.channels c set video_count = c.video_count + 1 where c.id = new.channel_id;
  end if;
  return null;
end;
$$;

drop trigger if exists videos_count_public on public.videos;
create trigger videos_count_public
  after insert or update of status, visibility or delete on public.videos
  for each row execute function public.videos_count_public();

update public.channels c
   set video_count = coalesce((
     select count(*) from public.videos v
      where v.channel_id = c.id and v.visibility = 'public' and v.status = 'ready'
   ), 0)
 where c.video_count is distinct from coalesce((
     select count(*) from public.videos v
      where v.channel_id = c.id and v.visibility = 'public' and v.status = 'ready'
   ), 0);

create or replace function public.processing_flag_on(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.feature_flags f
    where f.key = 'processing'
      and (f.mode = 'everyone' or (f.mode = 'test' and uid = any (f.users)))
  );
$$;

create or replace function public.encode_give_up_attempt(job public.encode_jobs, reason text, retry boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_reason text := left(coalesce(nullif(trim(both from reason), ''), 'encode failed'), 200);
begin
  if retry and job.attempts < public.encode_max_attempts() then
    update public.encode_jobs j
       set status = 'queued', progress = 0, worker = null, error = clean_reason, finished_at = null
     where j.id = job.id;
    return 'queued';
  end if;
  update public.encode_jobs j
     set status = 'failed', error = clean_reason, finished_at = now()
   where j.id = job.id;
  update public.videos v
     set status = 'failed', error = clean_reason
   where v.id = job.video_id;
  return 'failed';
end;
$$;

create or replace function public.claim_encode_job(worker text)
returns table (
  job_id uuid,
  video_id uuid,
  owner_id uuid,
  source_key text,
  source_bytes bigint,
  source_mime text,
  attempt int
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me text := left(coalesce(nullif(trim(both from claim_encode_job.worker), ''), 'worker'), 100);
  dead public.encode_jobs;
  next_job public.encode_jobs;
  vid public.videos;
begin
  for dead in
    select * from public.encode_jobs j
     where j.status = 'running'
       and (j.worker = me or j.started_at < now() - public.encode_stale_after())
     for update skip locked
  loop
    perform public.encode_give_up_attempt(dead, 'the worker stopped during the encode', true);
  end loop;

  select j.* into next_job
    from public.encode_jobs j
    join public.videos v on v.id = j.video_id
   where j.status = 'queued'
     and v.status in ('uploaded', 'processing')
     and v.source_key is not null
     and public.processing_flag_on(v.owner_id)
   order by j.created_at
   limit 1
   for update of j skip locked;

  if next_job.id is null then
    return;
  end if;

  update public.encode_jobs j
     set status = 'running',
         attempts = j.attempts + 1,
         worker = me,
         started_at = now(),
         finished_at = null,
         progress = 0
   where j.id = next_job.id
  returning * into next_job;

  update public.videos v
     set status = 'processing', error = null
   where v.id = next_job.video_id
  returning * into vid;

  return query select next_job.id, vid.id, vid.owner_id, vid.source_key, vid.source_bytes, vid.source_mime,
                      next_job.attempts;
end;
$$;

create or replace function public.encode_progress(job_id uuid, pct int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.encode_jobs j
     set progress = greatest(0, least(100, coalesce(encode_progress.pct, 0)))
   where j.id = encode_progress.job_id and j.status = 'running';
  return found;
end;
$$;

create or replace function public.encode_done(
  job_id uuid,
  duration_s numeric,
  width int,
  height int,
  hls_key text,
  thumbnail_url text,
  preview_sprite_key text,
  renditions jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  job public.encode_jobs;
begin
  select * into job from public.encode_jobs j where j.id = encode_done.job_id for update;
  if job.id is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if job.status = 'done' then
    return 'done';
  end if;
  if job.status <> 'running' then
    raise exception 'not_running' using errcode = 'P0001';
  end if;
  if encode_done.renditions is null or jsonb_typeof(encode_done.renditions) <> 'array'
     or jsonb_array_length(encode_done.renditions) = 0 then
    raise exception 'bad_renditions' using errcode = 'P0001';
  end if;

  update public.encode_jobs j
     set status = 'done', progress = 100, error = null, finished_at = now()
   where j.id = job.id;

  update public.videos v
     set status = 'ready',
         duration_s = encode_done.duration_s,
         width = encode_done.width,
         height = encode_done.height,
         hls_key = encode_done.hls_key,
         thumbnail_url = nullif(encode_done.thumbnail_url, ''),
         preview_sprite_key = encode_done.preview_sprite_key,
         renditions = encode_done.renditions,
         error = null,
         published_at = case
           when v.visibility = 'public' then coalesce(v.published_at, now())
           else v.published_at
         end
   where v.id = job.video_id;
  return 'done';
end;
$$;

create or replace function public.encode_failed(job_id uuid, error text, retry boolean default true)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  job public.encode_jobs;
begin
  select * into job from public.encode_jobs j where j.id = encode_failed.job_id for update;
  if job.id is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if job.status = 'failed' then
    return 'failed';
  end if;
  if job.status <> 'running' then
    raise exception 'not_running' using errcode = 'P0001';
  end if;
  return public.encode_give_up_attempt(job, encode_failed.error, coalesce(encode_failed.retry, true));
end;
$$;

revoke execute on function public.claim_encode_job(text) from public, anon, authenticated;
revoke execute on function public.encode_progress(uuid, int) from public, anon, authenticated;
revoke execute on function public.encode_done(uuid, numeric, int, int, text, text, text, jsonb)
  from public, anon, authenticated;
revoke execute on function public.encode_failed(uuid, text, boolean) from public, anon, authenticated;
revoke execute on function public.encode_give_up_attempt(public.encode_jobs, text, boolean)
  from public, anon, authenticated;
revoke execute on function public.processing_flag_on(uuid) from public, anon, authenticated;
revoke execute on function public.queue_encode_job() from public, anon, authenticated;
revoke execute on function public.videos_count_public() from public, anon, authenticated;

grant execute on function public.claim_encode_job(text) to service_role;
grant execute on function public.encode_progress(uuid, int) to service_role;
grant execute on function public.encode_done(uuid, numeric, int, int, text, text, text, jsonb) to service_role;
grant execute on function public.encode_failed(uuid, text, boolean) to service_role;

insert into public.feature_flags (key, label, description, mode)
values (
  'processing',
  'Processing',
  'The encoder worker turns uploads into HLS, thumbnails and a preview sprite. Studio shows progress.',
  'off'
)
on conflict (key) do nothing;
