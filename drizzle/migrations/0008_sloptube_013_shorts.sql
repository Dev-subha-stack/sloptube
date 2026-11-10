create or replace function public.shorts_flag_on(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.feature_flags f
    where f.key = 'shorts'
      and (f.mode = 'everyone' or (f.mode = 'test' and uid = any (f.users)))
  );
$$;

create or replace function public.video_is_short(duration numeric, width int, height int, choice boolean)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(choice, true)
     and coalesce(width, 0) > 0
     and coalesce(height, 0) > width
     and coalesce(duration, 0) > 0
     and floor(duration) <= 60
$$;

create or replace function public.view_threshold_s(duration numeric, is_short boolean)
returns int
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(is_short, false) then
      case when duration is null or duration <= 0 then 3 else least(3, greatest(1, floor(duration)::int)) end
    else public.view_threshold_s(duration)
  end
$$;

create or replace function public.shorts_score(
  views bigint,
  likes bigint,
  comments bigint,
  published_at timestamptz,
  as_of timestamptz
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select round((
    (1 + greatest(coalesce(views, 0), 0) + 2 * greatest(coalesce(likes, 0), 0) + 3 * greatest(coalesce(comments, 0), 0))::double precision
    / power(greatest(extract(epoch from (as_of - published_at)) / 3600.0, 1.0), 1.5)
  )::numeric, 6)
$$;

alter table public.videos add column if not exists is_short boolean not null default false;
alter table public.videos add column if not exists short_choice boolean;

create or replace function public.videos_set_is_short()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.is_short := public.video_is_short(new.duration_s, new.width, new.height, new.short_choice);
  return new;
end;
$$;

drop trigger if exists videos_set_is_short on public.videos;
create trigger videos_set_is_short
  before insert or update of duration_s, width, height, short_choice on public.videos
  for each row execute function public.videos_set_is_short();

update public.videos v
   set is_short = public.video_is_short(v.duration_s, v.width, v.height, v.short_choice)
 where v.is_short is distinct from public.video_is_short(v.duration_s, v.width, v.height, v.short_choice);

create index if not exists videos_shorts_idx
  on public.videos (published_at desc, id desc)
  where is_short and visibility = 'public' and status = 'ready';
create index if not exists videos_channel_shorts_idx
  on public.videos (channel_id, published_at desc, id desc)
  where is_short and visibility = 'public' and status = 'ready';

create table if not exists public.short_watches (
  user_id uuid not null references public.profiles (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  watched_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create index if not exists short_watches_video_idx on public.short_watches (video_id);

alter table public.short_watches enable row level security;

drop policy if exists "people read their own short watches" on public.short_watches;
create policy "people read their own short watches"
  on public.short_watches
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.short_watches from anon, authenticated;
grant select on public.short_watches to authenticated;
grant all on public.short_watches to service_role;

create table if not exists public.shorts_requests (
  key text not null,
  bucket text not null,
  at timestamptz not null default now()
);

create index if not exists shorts_requests_recent_idx on public.shorts_requests (key, bucket, at desc);

alter table public.shorts_requests enable row level security;
revoke all on public.shorts_requests from anon, authenticated;
grant all on public.shorts_requests to service_role;

create or replace function public.short_watches_follow_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.short_watches s where s.user_id = old.user_id and s.video_id = old.video_id;
  return null;
end;
$$;

drop trigger if exists short_watches_follow_history on public.watch_history;
create trigger short_watches_follow_history
  after delete on public.watch_history
  for each row execute function public.short_watches_follow_history();

create or replace function public.shorts_throttle(bucket text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  headers json := nullif(current_setting('request.headers', true), '')::json;
  who text;
  recent int;
  lim int := case bucket when 'choice' then 30 else 60 end;
begin
  who := public.engagement_viewer_key();
  if who is null then
    who := 'addr:' || left(coalesce(nullif(btrim(split_part(coalesce(headers ->> 'x-forwarded-for', ''), ',', 1)), ''), 'unknown'), 64);
  end if;
  perform pg_advisory_xact_lock(hashtextextended('shorts:' || bucket || ':' || who, 0));
  delete from public.shorts_requests r
   where r.key = who and r.bucket = shorts_throttle.bucket and r.at < now() - interval '1 minute';
  if random() < 0.01 then
    delete from public.shorts_requests r where r.at < now() - interval '1 minute';
  end if;
  select count(*) into recent from public.shorts_requests r where r.key = who and r.bucket = shorts_throttle.bucket;
  if recent >= lim then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.shorts_requests (key, bucket) values (who, shorts_throttle.bucket);
end;
$$;

drop function if exists public.list_shorts(jsonb, int);
drop function if exists public.get_short(uuid);
drop function if exists public.set_short_choice(uuid, boolean);
drop function if exists public.feed_videos(text, timestamptz, uuid, int, uuid);
drop function if exists public.feed_videos(text, timestamptz, uuid, int, uuid, boolean);

create function public.list_shorts(cursor jsonb default null, lim int default 10)
returns table (
  id uuid,
  title text,
  duration_s numeric,
  width int,
  height int,
  thumbnail_url text,
  hls_key text,
  published_at timestamptz,
  views bigint,
  like_count bigint,
  comment_count bigint,
  comments_mode text,
  my_reaction text,
  channel_id uuid,
  channel_handle text,
  channel_name text,
  channel_avatar_url text,
  tier int,
  score numeric,
  as_of timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  at_time timestamptz;
  c_tier int;
  c_score numeric;
  c_id uuid;
  n int := least(greatest(coalesce(list_shorts.lim, 10), 1), 30);
begin
  if not public.shorts_flag_on(me) then
    raise exception 'shorts_off' using errcode = 'P0001';
  end if;
  perform public.shorts_throttle('list');

  if list_shorts.cursor is not null then
    begin
      at_time := (list_shorts.cursor ->> 'at')::timestamptz;
      c_tier := (list_shorts.cursor ->> 'tier')::int;
      c_score := (list_shorts.cursor ->> 'score')::numeric;
      c_id := (list_shorts.cursor ->> 'id')::uuid;
    exception when others then
      at_time := null;
    end;
    if at_time is null or c_tier is null or c_score is null or c_id is null or at_time > now() + interval '1 minute' then
      return;
    end if;
  else
    at_time := now();
  end if;

  return query
  with ranked as (
    select
      v.*,
      case when exists (
        select 1 from public.short_watches w
        where w.user_id = me and w.video_id = v.id and w.watched_at <= at_time
      ) then 1 else 0 end as t,
      public.shorts_score(v.views, v.like_count, v.comment_count, v.published_at, at_time) as s
    from public.videos v
    where v.is_short
      and v.visibility = 'public'
      and v.status = 'ready'
      and v.published_at is not null
      and v.published_at <= at_time
      and v.owner_id is distinct from me
  )
  select
    r.id,
    r.title,
    r.duration_s,
    r.width,
    r.height,
    r.thumbnail_url,
    r.hls_key,
    r.published_at,
    r.views,
    r.like_count,
    r.comment_count,
    coalesce(r.comments_mode, c.comments_default, 'on'),
    (select x.kind from public.video_reactions x where x.user_id = me and x.video_id = r.id),
    c.id,
    c.handle,
    coalesce(nullif(c.name, ''), c.handle),
    c.avatar_url,
    r.t,
    r.s,
    at_time
  from ranked r
  join public.channels c on c.id = r.channel_id
  where c_id is null
     or r.t > c_tier
     or (r.t = c_tier and (r.s < c_score or (r.s = c_score and r.id < c_id)))
  order by r.t, r.s desc, r.id desc
  limit n;
end;
$$;

create function public.get_short(video_id uuid)
returns table (
  id uuid,
  title text,
  duration_s numeric,
  width int,
  height int,
  thumbnail_url text,
  hls_key text,
  published_at timestamptz,
  views bigint,
  like_count bigint,
  comment_count bigint,
  comments_mode text,
  my_reaction text,
  channel_id uuid,
  channel_handle text,
  channel_name text,
  channel_avatar_url text,
  is_short boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    v.id,
    v.title,
    v.duration_s,
    v.width,
    v.height,
    v.thumbnail_url,
    v.hls_key,
    v.published_at,
    v.views,
    v.like_count,
    v.comment_count,
    coalesce(v.comments_mode, c.comments_default, 'on'),
    (select x.kind from public.video_reactions x where x.user_id = (select auth.uid()) and x.video_id = v.id),
    c.id,
    c.handle,
    coalesce(nullif(c.name, ''), c.handle),
    c.avatar_url,
    v.is_short
  from public.videos v
  join public.channels c on c.id = v.channel_id
  where v.id = get_short.video_id
    and v.status = 'ready'
    and (v.visibility in ('public', 'unlisted') or v.owner_id = (select auth.uid()))
    and public.shorts_flag_on((select auth.uid()));
$$;

create function public.set_short_choice(video_id uuid, "on" boolean)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  v public.videos;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  if not public.shorts_flag_on(me) then
    raise exception 'shorts_off' using errcode = 'P0001';
  end if;
  perform public.shorts_throttle('choice');
  select * into v from public.videos x where x.id = set_short_choice.video_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v.owner_id <> me then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if set_short_choice."on" and v.duration_s is not null
     and not public.video_is_short(v.duration_s, v.width, v.height, true) then
    raise exception 'not_a_short' using errcode = 'P0001';
  end if;
  update public.videos x set short_choice = set_short_choice."on" where x.id = v.id
  returning x.is_short into v.is_short;
  return v.is_short;
end;
$$;

create function public.feed_videos(
  kind text default 'newest',
  cursor timestamptz default null,
  cursor_id uuid default null,
  lim int default 24,
  for_channel uuid default null,
  exclude_shorts boolean default false
)
returns table (
  id uuid,
  title text,
  duration_s numeric,
  thumbnail_url text,
  hls_key text,
  preview_sprite_key text,
  published_at timestamptz,
  views bigint,
  score double precision,
  channel_id uuid,
  channel_handle text,
  channel_name text,
  channel_avatar_url text,
  is_short boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with args as (
    select
      coalesce(feed_videos.kind, 'newest') as kind,
      least(greatest(coalesce(feed_videos.lim, 24), 1), 50) as lim
  ),
  cards as (
    select
      v.id,
      v.title,
      v.duration_s,
      v.thumbnail_url,
      v.hls_key,
      v.preview_sprite_key,
      v.published_at,
      v.views,
      v.views::double precision
        / power(greatest(extract(epoch from (now() - v.published_at)) / 3600.0, 1.0), 1.5) as score,
      c.id as channel_id,
      c.handle as channel_handle,
      coalesce(nullif(c.name, ''), c.handle) as channel_name,
      c.avatar_url as channel_avatar_url,
      v.is_short
    from public.videos v
    join public.channels c on c.id = v.channel_id
    cross join args a
    where v.visibility = 'public'
      and v.status = 'ready'
      and v.published_at is not null
      and case a.kind
        when 'newest' then true
        when 'trending' then v.published_at > now() - interval '30 days'
        when 'channel' then v.channel_id = feed_videos.for_channel
        when 'channel_shorts' then v.channel_id = feed_videos.for_channel and v.is_short
        else false
      end
      and not (coalesce(feed_videos.exclude_shorts, false) and a.kind <> 'channel_shorts' and v.is_short)
      and (
        a.kind = 'trending'
        or feed_videos.cursor is null
        or (v.published_at, v.id) < (feed_videos.cursor, coalesce(feed_videos.cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
      )
  )
  select cards.*
  from cards
  cross join args a
  order by
    case when a.kind = 'trending' then cards.score end desc nulls last,
    cards.published_at desc,
    cards.id desc
  limit (select lim from args);
$$;

create or replace function public.watch_ping(video_id uuid, position_s numeric, played_s numeric)
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
  paused boolean;
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
  if not ev.counted and ev.watched_s >= public.view_threshold_s(v.duration_s, v.is_short) then
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

  if me is not null then
    paused := coalesce((select p.history_paused from public.profiles p where p.id = me), false);
    if not paused then
      insert into public.watch_history as h (user_id, video_id, position_s, duration_s, last_at)
      values (me, v.id, pos, v.duration_s, now())
      on conflict on constraint watch_history_pkey do update
        set position_s = excluded.position_s, duration_s = excluded.duration_s, last_at = excluded.last_at;
      if v.is_short and ev.watched_s >= public.view_threshold_s(v.duration_s, true) then
        insert into public.short_watches as s (user_id, video_id)
        values (me, v.id)
        on conflict on constraint short_watches_pkey do nothing;
      end if;
    end if;
  end if;

  return query select counted_now, total, ev.watched_s;
end;
$$;

revoke execute on function public.shorts_flag_on(uuid) from public, anon, authenticated;
revoke execute on function public.shorts_throttle(text) from public, anon, authenticated;
revoke execute on function public.videos_set_is_short() from public, anon, authenticated;
revoke execute on function public.short_watches_follow_history() from public, anon, authenticated;

revoke execute on function public.list_shorts(jsonb, int) from public;
revoke execute on function public.get_short(uuid) from public;
revoke execute on function public.set_short_choice(uuid, boolean) from public;
revoke execute on function public.feed_videos(text, timestamptz, uuid, int, uuid, boolean) from public;

grant execute on function public.list_shorts(jsonb, int) to anon, authenticated;
grant execute on function public.get_short(uuid) to anon, authenticated;
grant execute on function public.set_short_choice(uuid, boolean) to authenticated;
grant execute on function public.feed_videos(text, timestamptz, uuid, int, uuid, boolean) to anon, authenticated;

insert into public.feature_flags (key, label, description, mode)
values (
  'shorts',
  'Shorts',
  'The /shorts feed and /shorts/<id>, the Shorts shelf on the home feed, the Shorts tab on channel pages and the "Upload as a Short" box.',
  'off'
)
on conflict (key) do nothing;
