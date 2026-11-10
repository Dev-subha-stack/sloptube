create or replace function public.engagement_flag_on(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.feature_flags f
    where f.key = 'engagement'
      and (f.mode = 'everyone' or (f.mode = 'test' and uid = any (f.users)))
  );
$$;

create or replace function public.view_threshold_s(duration numeric)
returns int
language sql
immutable
set search_path = ''
as $$
  select case
    when duration is null or duration <= 0 then 10
    else least(10, greatest(1, floor(duration)::int))
  end
$$;

create or replace function public.engagement_limit_per_minute(bucket text)
returns int
language sql
immutable
set search_path = ''
as $$ select case bucket when 'react' then 30 else 20 end $$;

alter table public.videos add column if not exists like_count bigint not null default 0;
alter table public.videos drop constraint if exists videos_like_count_positive;
alter table public.videos add constraint videos_like_count_positive check (like_count >= 0);

alter table public.profiles add column if not exists history_paused boolean not null default false;

create table if not exists public.video_reactions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id),
  constraint video_reactions_kind_valid check (kind in ('like', 'dislike'))
);

create index if not exists video_reactions_video_idx on public.video_reactions (video_id, kind);
create index if not exists video_reactions_created_idx on public.video_reactions (created_at);

alter table public.video_reactions enable row level security;

drop policy if exists "people read their own reactions" on public.video_reactions;
create policy "people read their own reactions"
  on public.video_reactions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.video_reactions from anon, authenticated;
grant select on public.video_reactions to authenticated;
grant all on public.video_reactions to service_role;

create table if not exists public.video_dislike_counts (
  video_id uuid primary key references public.videos (id) on delete cascade,
  dislike_count bigint not null default 0,
  constraint video_dislike_counts_positive check (dislike_count >= 0)
);

alter table public.video_dislike_counts enable row level security;

drop policy if exists "owners read the dislike count of their own videos" on public.video_dislike_counts;
create policy "owners read the dislike count of their own videos"
  on public.video_dislike_counts
  for select
  to authenticated
  using (exists (
    select 1 from public.videos v
    where v.id = video_dislike_counts.video_id and v.owner_id = (select auth.uid())
  ));

revoke all on public.video_dislike_counts from anon, authenticated;
grant select on public.video_dislike_counts to authenticated;
grant all on public.video_dislike_counts to service_role;

create table if not exists public.view_events (
  video_id uuid not null references public.videos (id) on delete cascade,
  viewer_key text not null,
  day date not null,
  watched_s int not null default 0,
  counted boolean not null default false,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  primary key (video_id, viewer_key, day),
  constraint view_events_watched_positive check (watched_s >= 0)
);

create index if not exists view_events_day_idx on public.view_events (day, video_id);

alter table public.view_events enable row level security;
revoke all on public.view_events from anon, authenticated;
grant all on public.view_events to service_role;

create table if not exists public.watch_history (
  user_id uuid not null references public.profiles (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  position_s numeric not null default 0,
  duration_s numeric,
  last_at timestamptz not null default now(),
  primary key (user_id, video_id),
  constraint watch_history_position_positive check (position_s >= 0)
);

create index if not exists watch_history_recent_idx on public.watch_history (user_id, last_at desc, video_id desc);
create index if not exists watch_history_video_idx on public.watch_history (video_id);

alter table public.watch_history enable row level security;

drop policy if exists "people read their own history" on public.watch_history;
create policy "people read their own history"
  on public.watch_history
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.watch_history from anon, authenticated;
grant select on public.watch_history to authenticated;
grant all on public.watch_history to service_role;

create table if not exists public.engagement_requests (
  key text not null,
  bucket text not null,
  at timestamptz not null default now()
);

create index if not exists engagement_requests_recent_idx
  on public.engagement_requests (key, bucket, at desc);

alter table public.engagement_requests enable row level security;
revoke all on public.engagement_requests from anon, authenticated;
grant all on public.engagement_requests to service_role;

create table if not exists public.video_stats_daily (
  video_id uuid not null references public.videos (id) on delete cascade,
  day date not null,
  views int not null default 0,
  watch_s bigint not null default 0,
  likes int not null default 0,
  dislikes int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (video_id, day)
);

alter table public.video_stats_daily enable row level security;

drop policy if exists "owners read the stats of their own videos" on public.video_stats_daily;
create policy "owners read the stats of their own videos"
  on public.video_stats_daily
  for select
  to authenticated
  using (exists (
    select 1 from public.videos v
    where v.id = video_stats_daily.video_id and v.owner_id = (select auth.uid())
  ));

revoke all on public.video_stats_daily from anon, authenticated;
grant select on public.video_stats_daily to authenticated;
grant all on public.video_stats_daily to service_role;

create or replace function public.video_reactions_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_like int := case when tg_op <> 'INSERT' and old.kind = 'like' then 1 else 0 end;
  old_dislike int := case when tg_op <> 'INSERT' and old.kind = 'dislike' then 1 else 0 end;
  new_like int := case when tg_op <> 'DELETE' and new.kind = 'like' then 1 else 0 end;
  new_dislike int := case when tg_op <> 'DELETE' and new.kind = 'dislike' then 1 else 0 end;
  vid uuid := case when tg_op = 'DELETE' then old.video_id else new.video_id end;
begin
  if new_like <> old_like then
    update public.videos v set like_count = greatest(v.like_count + new_like - old_like, 0) where v.id = vid;
  end if;
  if new_dislike <> old_dislike then
    insert into public.video_dislike_counts as d (video_id, dislike_count)
    values (vid, greatest(new_dislike - old_dislike, 0))
    on conflict (video_id) do update
      set dislike_count = greatest(d.dislike_count + new_dislike - old_dislike, 0);
  end if;
  return null;
end;
$$;

drop trigger if exists video_reactions_count on public.video_reactions;
create trigger video_reactions_count
  after insert or update of kind or delete on public.video_reactions
  for each row execute function public.video_reactions_count();

update public.videos v
   set like_count = coalesce((select count(*) from public.video_reactions r where r.video_id = v.id and r.kind = 'like'), 0)
 where v.like_count is distinct from coalesce((
     select count(*) from public.video_reactions r where r.video_id = v.id and r.kind = 'like'
   ), 0);

insert into public.video_dislike_counts (video_id, dislike_count)
select r.video_id, count(*) from public.video_reactions r where r.kind = 'dislike' group by r.video_id
on conflict (video_id) do update set dislike_count = excluded.dislike_count;

update public.video_dislike_counts d
   set dislike_count = 0
 where d.dislike_count <> 0
   and not exists (select 1 from public.video_reactions r where r.video_id = d.video_id and r.kind = 'dislike');

create or replace function public.engagement_viewer_key()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  headers json := nullif(current_setting('request.headers', true), '')::json;
  sent text;
begin
  if me is not null then
    return 'u:' || me::text;
  end if;
  sent := lower(btrim(coalesce(headers ->> 'x-viewer-key', '')));
  if sent !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  return 'a:' || encode(sha256(convert_to('sloptube-viewer:' || sent, 'UTF8')), 'hex');
end;
$$;

create or replace function public.engagement_throttle(who text, bucket text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  recent int;
begin
  perform pg_advisory_xact_lock(hashtextextended('engagement:' || bucket || ':' || who, 0));
  delete from public.engagement_requests r
   where r.key = who and r.bucket = engagement_throttle.bucket and r.at < now() - interval '1 minute';
  if random() < 0.01 then
    delete from public.engagement_requests r where r.at < now() - interval '1 minute';
  end if;
  select count(*) into recent
    from public.engagement_requests r
   where r.key = who and r.bucket = engagement_throttle.bucket;
  if recent >= public.engagement_limit_per_minute(bucket) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.engagement_requests (key, bucket) values (who, engagement_throttle.bucket);
end;
$$;

drop function if exists public.react(uuid, text);
drop function if exists public.watch_ping(uuid, numeric, numeric);
drop function if exists public.video_engagement(uuid);
drop function if exists public.my_history(timestamptz, uuid, int);
drop function if exists public.my_progress(uuid[]);
drop function if exists public.clear_history();
drop function if exists public.remove_from_history(uuid);
drop function if exists public.set_history_paused(boolean);
drop function if exists public.history_paused();
drop function if exists public.rollup_video_stats(int);

create function public.react(video_id uuid, kind text)
returns table (reaction text, like_count bigint, dislike_count bigint)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  v public.videos;
  mine boolean;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  if not public.engagement_flag_on(me) then
    raise exception 'engagement_off' using errcode = 'P0001';
  end if;
  if react.kind is not null and react.kind not in ('like', 'dislike') then
    raise exception 'bad_kind' using errcode = 'P0001';
  end if;
  select * into v from public.videos x where x.id = react.video_id;
  mine := found and v.owner_id = me;
  if not found or not (mine or (v.status = 'ready' and v.visibility in ('public', 'unlisted'))) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  perform public.engagement_throttle('u:' || me::text, 'react');

  if react.kind is null then
    delete from public.video_reactions r where r.user_id = me and r.video_id = react.video_id;
  else
    insert into public.video_reactions as r (user_id, video_id, kind)
    values (me, react.video_id, react.kind)
    on conflict on constraint video_reactions_pkey do update
      set kind = excluded.kind, created_at = now()
      where r.kind is distinct from excluded.kind;
  end if;

  return query
  select
    (select r.kind from public.video_reactions r where r.user_id = me and r.video_id = react.video_id),
    x.like_count,
    case when mine then coalesce((select d.dislike_count from public.video_dislike_counts d where d.video_id = x.id), 0) end
  from public.videos x
  where x.id = react.video_id;
end;
$$;

create function public.watch_ping(video_id uuid, position_s numeric, played_s numeric)
returns table (counted boolean, views bigint, watched_s int)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  who text;
  v public.videos;
  today date := (now() at time zone 'utc')::date;
  ev public.view_events;
  opened boolean := false;
  credit numeric;
  counted_now boolean := false;
  pos numeric;
  total bigint;
begin
  if not public.engagement_flag_on(me) then
    raise exception 'engagement_off' using errcode = 'P0001';
  end if;
  who := public.engagement_viewer_key();
  if who is null then
    raise exception 'no_viewer_key' using errcode = 'P0001';
  end if;
  select * into v from public.videos x where x.id = watch_ping.video_id;
  if not found or v.status <> 'ready'
     or not (v.visibility in ('public', 'unlisted') or v.owner_id = me) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  perform public.engagement_throttle(who, 'ping');

  pos := greatest(0, coalesce(watch_ping.position_s, 0));
  if v.duration_s is not null and v.duration_s > 0 then
    pos := least(pos, v.duration_s);
  end if;

  insert into public.view_events as e (video_id, viewer_key, day)
  values (v.id, who, today)
  on conflict on constraint view_events_pkey do nothing;
  get diagnostics total = row_count;
  opened := total > 0;

  select * into ev from public.view_events e
   where e.video_id = v.id and e.viewer_key = who and e.day = today
   for update;

  credit := case when opened then 0 else least(greatest(coalesce(watch_ping.played_s, 0), 0), 60) end;
  ev.watched_s := greatest(
    ev.watched_s,
    least(ev.watched_s + floor(credit)::int, floor(extract(epoch from (now() - ev.first_at)))::int + 1)
  );
  if not ev.counted and ev.watched_s >= public.view_threshold_s(v.duration_s) then
    ev.counted := true;
    counted_now := true;
  end if;

  update public.view_events e
     set watched_s = ev.watched_s, counted = ev.counted, last_at = now()
   where e.video_id = v.id and e.viewer_key = who and e.day = today;

  if counted_now then
    update public.videos x set views = x.views + 1 where x.id = v.id returning x.views into total;
  else
    total := v.views;
  end if;

  if me is not null and not coalesce((select p.history_paused from public.profiles p where p.id = me), false) then
    insert into public.watch_history as h (user_id, video_id, position_s, duration_s, last_at)
    values (me, v.id, pos, v.duration_s, now())
    on conflict on constraint watch_history_pkey do update
      set position_s = excluded.position_s, duration_s = excluded.duration_s, last_at = excluded.last_at;
  end if;

  return query select counted_now, total, ev.watched_s;
end;
$$;

create function public.video_engagement(video_id uuid)
returns table (
  like_count bigint,
  dislike_count bigint,
  my_reaction text,
  position_s numeric,
  duration_s numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    v.like_count,
    case when mine.yes then coalesce((select d.dislike_count from public.video_dislike_counts d where d.video_id = v.id), 0) end,
    (select r.kind from public.video_reactions r where r.user_id = (select auth.uid()) and r.video_id = v.id),
    h.position_s,
    coalesce(h.duration_s, v.duration_s)
  from public.videos v
  cross join lateral (select coalesce(v.owner_id = (select auth.uid()), false) as yes) mine
  left join public.watch_history h on h.user_id = (select auth.uid()) and h.video_id = v.id
  where v.id = video_engagement.video_id
    and (mine.yes or (v.status = 'ready' and v.visibility in ('public', 'unlisted')));
$$;

create function public.my_history(
  cursor timestamptz default null,
  cursor_id uuid default null,
  lim int default 20
)
returns table (
  id uuid,
  title text,
  description text,
  duration_s numeric,
  thumbnail_url text,
  hls_key text,
  preview_sprite_key text,
  published_at timestamptz,
  views bigint,
  channel_id uuid,
  channel_handle text,
  channel_name text,
  channel_avatar_url text,
  position_s numeric,
  progress double precision,
  watched_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    v.id,
    v.title,
    left(v.description, 500),
    v.duration_s,
    v.thumbnail_url,
    v.hls_key,
    v.preview_sprite_key,
    coalesce(v.published_at, v.created_at),
    v.views,
    c.id,
    c.handle,
    coalesce(nullif(c.name, ''), c.handle),
    c.avatar_url,
    h.position_s,
    case
      when coalesce(h.duration_s, v.duration_s, 0) > 0
        then least(1.0, h.position_s / coalesce(h.duration_s, v.duration_s))::double precision
      else 0
    end,
    h.last_at
  from public.watch_history h
  join public.videos v on v.id = h.video_id
  join public.channels c on c.id = v.channel_id
  where h.user_id = (select auth.uid())
    and v.status = 'ready'
    and (v.visibility in ('public', 'unlisted') or v.owner_id = h.user_id)
    and (
      my_history.cursor is null
      or (h.last_at, h.video_id) < (my_history.cursor, coalesce(my_history.cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
    )
  order by h.last_at desc, h.video_id desc
  limit least(greatest(coalesce(my_history.lim, 20), 1), 50);
$$;

create function public.my_progress(video_ids uuid[])
returns table (video_id uuid, position_s numeric, duration_s numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select h.video_id, h.position_s, h.duration_s
  from public.watch_history h
  where h.user_id = (select auth.uid())
    and h.video_id = any (my_progress.video_ids[1:100]);
$$;

create function public.clear_history()
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  gone int;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  delete from public.watch_history h where h.user_id = me;
  get diagnostics gone = row_count;
  return gone;
end;
$$;

create function public.remove_from_history(video_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  delete from public.watch_history h where h.user_id = me and h.video_id = remove_from_history.video_id;
  return found;
end;
$$;

create function public.set_history_paused("on" boolean)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  now_paused boolean;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  update public.profiles p set history_paused = coalesce(set_history_paused."on", false)
   where p.id = me
  returning p.history_paused into now_paused;
  return coalesce(now_paused, false);
end;
$$;

create function public.history_paused()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.history_paused from public.profiles p where p.id = (select auth.uid())), false);
$$;

create function public.rollup_video_stats(days int default 2)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  since date := (now() at time zone 'utc')::date - (least(greatest(coalesce(days, 2), 1), 400) - 1);
  touched int;
begin
  insert into public.video_stats_daily as s (video_id, day, views, watch_s, likes, dislikes, updated_at)
  select
    coalesce(e.video_id, r.video_id),
    coalesce(e.day, r.day),
    coalesce(e.views, 0),
    coalesce(e.watch_s, 0),
    coalesce(r.likes, 0),
    coalesce(r.dislikes, 0),
    now()
  from (
    select ve.video_id, ve.day, count(*) filter (where ve.counted)::int as views, sum(ve.watched_s)::bigint as watch_s
    from public.view_events ve
    where ve.day >= since
    group by ve.video_id, ve.day
  ) e
  full outer join (
    select vr.video_id, (vr.created_at at time zone 'utc')::date as day,
           count(*) filter (where vr.kind = 'like')::int as likes,
           count(*) filter (where vr.kind = 'dislike')::int as dislikes
    from public.video_reactions vr
    where vr.created_at >= since::timestamp at time zone 'utc'
    group by vr.video_id, (vr.created_at at time zone 'utc')::date
  ) r on r.video_id = e.video_id and r.day = e.day
  on conflict (video_id, day) do update
    set views = excluded.views,
        watch_s = excluded.watch_s,
        likes = excluded.likes,
        dislikes = excluded.dislikes,
        updated_at = excluded.updated_at;
  get diagnostics touched = row_count;
  return touched;
end;
$$;

select public.rollup_video_stats(2);

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $cron$select cron.schedule('sloptube-video-stats', '7 * * * *', 'select public.rollup_video_stats(2)')$cron$;
  else
    raise notice 'pg_cron is not on: video_stats_daily is not refreshed every hour.';
  end if;
end;
$$;

revoke execute on function public.engagement_flag_on(uuid) from public, anon, authenticated;
revoke execute on function public.engagement_viewer_key() from public, anon, authenticated;
revoke execute on function public.engagement_throttle(text, text) from public, anon, authenticated;
revoke execute on function public.video_reactions_count() from public, anon, authenticated;
revoke execute on function public.rollup_video_stats(int) from public, anon, authenticated;

revoke execute on function public.react(uuid, text) from public;
revoke execute on function public.watch_ping(uuid, numeric, numeric) from public;
revoke execute on function public.video_engagement(uuid) from public;
revoke execute on function public.my_history(timestamptz, uuid, int) from public;
revoke execute on function public.my_progress(uuid[]) from public;
revoke execute on function public.clear_history() from public;
revoke execute on function public.remove_from_history(uuid) from public;
revoke execute on function public.set_history_paused(boolean) from public;
revoke execute on function public.history_paused() from public;

grant execute on function public.react(uuid, text) to authenticated;
grant execute on function public.watch_ping(uuid, numeric, numeric) to anon, authenticated;
grant execute on function public.video_engagement(uuid) to anon, authenticated;
grant execute on function public.my_history(timestamptz, uuid, int) to authenticated;
grant execute on function public.my_progress(uuid[]) to authenticated;
grant execute on function public.clear_history() to authenticated;
grant execute on function public.remove_from_history(uuid) to authenticated;
grant execute on function public.set_history_paused(boolean) to authenticated;
grant execute on function public.history_paused() to authenticated;
grant execute on function public.rollup_video_stats(int) to service_role;

insert into public.feature_flags (key, label, description, mode)
values (
  'engagement',
  'Likes, views and history',
  'Like and dislike buttons, counted views, watch history at /feed/history, resume and the red progress bars.',
  'off'
)
on conflict (key) do nothing;
