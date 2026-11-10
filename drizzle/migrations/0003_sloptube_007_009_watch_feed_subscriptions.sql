alter table public.videos add column if not exists views bigint not null default 0;

alter table public.videos drop constraint if exists videos_views_positive;
alter table public.videos add constraint videos_views_positive check (views >= 0);

drop function if exists public.watch_video(uuid);

create function public.watch_video(video_id uuid)
returns table (
  id uuid,
  title text,
  description text,
  visibility text,
  status text,
  is_owner boolean,
  created_at timestamptz,
  published_at timestamptz,
  duration_s numeric,
  width int,
  height int,
  views bigint,
  renditions jsonb,
  thumbnail_url text,
  hls_key text,
  preview_sprite_key text,
  channel_id uuid,
  channel_handle text,
  channel_name text,
  channel_avatar_url text,
  channel_subscriber_count int
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    v.id,
    v.title,
    v.description,
    v.visibility,
    v.status,
    mine.yes,
    v.created_at,
    v.published_at,
    v.duration_s,
    v.width,
    v.height,
    v.views,
    case when playable.yes then v.renditions end,
    case when playable.yes then v.thumbnail_url end,
    case when playable.yes then v.hls_key end,
    case when playable.yes then v.preview_sprite_key end,
    c.id,
    c.handle,
    coalesce(nullif(c.name, ''), c.handle),
    c.avatar_url,
    c.subscriber_count
  from public.videos v
  join public.channels c on c.id = v.channel_id
  cross join lateral (select coalesce(v.owner_id = (select auth.uid()), false) as yes) mine
  cross join lateral (select v.status = 'ready' or mine.yes as yes) playable
  where v.id = watch_video.video_id
    and (mine.yes or v.visibility in ('public', 'unlisted'));
$$;

revoke execute on function public.watch_video(uuid) from public;
grant execute on function public.watch_video(uuid) to anon, authenticated;

insert into public.feature_flags (key, label, description, mode)
values (
  'watch',
  'Watch page',
  'The /watch page with the HLS player, and /api/media for its files.',
  'off'
)
on conflict (key) do nothing;

-- 008 feed

create index if not exists videos_feed_idx
  on public.videos (visibility, status, published_at desc, id desc);

create index if not exists videos_channel_feed_idx
  on public.videos (channel_id, published_at desc, id desc)
  where visibility = 'public' and status = 'ready';

drop function if exists public.feed_videos(text, timestamptz, uuid, int, uuid);
drop function if exists public.related_videos(uuid, int);

create function public.feed_videos(
  kind text default 'newest',
  cursor timestamptz default null,
  cursor_id uuid default null,
  lim int default 24,
  for_channel uuid default null
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
  channel_avatar_url text
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
      c.avatar_url as channel_avatar_url
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
        else false
      end
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

revoke execute on function public.feed_videos(text, timestamptz, uuid, int, uuid) from public;
grant execute on function public.feed_videos(text, timestamptz, uuid, int, uuid) to anon, authenticated;

create function public.related_videos(video_id uuid, lim int default 12)
returns table (
  id uuid,
  title text,
  duration_s numeric,
  thumbnail_url text,
  hls_key text,
  preview_sprite_key text,
  published_at timestamptz,
  views bigint,
  channel_id uuid,
  channel_handle text,
  channel_name text,
  channel_avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  with current_video as (
    select v.channel_id
    from public.videos v
    where v.id = related_videos.video_id
      and (v.visibility in ('public', 'unlisted') or v.owner_id = (select auth.uid()))
  )
  select
    v.id,
    v.title,
    v.duration_s,
    v.thumbnail_url,
    v.hls_key,
    v.preview_sprite_key,
    v.published_at,
    v.views,
    c.id,
    c.handle,
    coalesce(nullif(c.name, ''), c.handle),
    c.avatar_url
  from public.videos v
  join public.channels c on c.id = v.channel_id
  where v.visibility = 'public'
    and v.status = 'ready'
    and v.published_at is not null
    and v.id <> related_videos.video_id
  order by
    (v.channel_id = (select cv.channel_id from current_video cv)) desc nulls last,
    v.published_at desc,
    v.id desc
  limit least(greatest(coalesce(related_videos.lim, 12), 1), 50);
$$;

revoke execute on function public.related_videos(uuid, int) from public;
grant execute on function public.related_videos(uuid, int) to anon, authenticated;

insert into public.feature_flags (key, label, description, mode)
values (
  'feed',
  'Home feed',
  'The home grid, /trending, the Videos tab on channel pages and Up next from the feed.',
  'off'
)
on conflict (key) do nothing;

-- 009 subscriptions

create or replace function public.subscription_changes_per_hour()
returns int
language sql
immutable
set search_path = ''
as $$ select 60 $$;

create or replace function public.subscriptions_flag_on(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.feature_flags f
    where f.key = 'subscriptions'
      and (f.mode = 'everyone' or (f.mode = 'test' and uid = any (f.users)))
  );
$$;

create table if not exists public.subscriptions (
  subscriber_id uuid not null references public.profiles (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  notify boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (subscriber_id, channel_id)
);

create index if not exists subscriptions_channel_idx on public.subscriptions (channel_id);

alter table public.subscriptions enable row level security;

drop policy if exists "people read their own subscriptions" on public.subscriptions;
create policy "people read their own subscriptions"
  on public.subscriptions
  for select
  to authenticated
  using (subscriber_id = (select auth.uid()));

drop policy if exists "people add their own subscriptions" on public.subscriptions;
create policy "people add their own subscriptions"
  on public.subscriptions
  for insert
  to authenticated
  with check (subscriber_id = (select auth.uid()));

drop policy if exists "people change their own subscriptions" on public.subscriptions;
create policy "people change their own subscriptions"
  on public.subscriptions
  for update
  to authenticated
  using (subscriber_id = (select auth.uid()))
  with check (subscriber_id = (select auth.uid()));

drop policy if exists "people remove their own subscriptions" on public.subscriptions;
create policy "people remove their own subscriptions"
  on public.subscriptions
  for delete
  to authenticated
  using (subscriber_id = (select auth.uid()));

revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

create table if not exists public.subscription_changes (
  subscriber_id uuid not null references public.profiles (id) on delete cascade,
  at timestamptz not null default now()
);

create index if not exists subscription_changes_recent_idx
  on public.subscription_changes (subscriber_id, at desc);

alter table public.subscription_changes enable row level security;
revoke all on public.subscription_changes from anon, authenticated;
grant all on public.subscription_changes to service_role;

create or replace function public.subscriptions_not_own_channel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.channels c
    where c.id = new.channel_id and c.owner_id = new.subscriber_id
  ) then
    raise exception 'own_channel' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists subscriptions_not_own_channel on public.subscriptions;
create trigger subscriptions_not_own_channel
  before insert or update of channel_id, subscriber_id on public.subscriptions
  for each row execute function public.subscriptions_not_own_channel();

create or replace function public.subscriptions_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.channels c set subscriber_count = c.subscriber_count + 1 where c.id = new.channel_id;
  elsif tg_op = 'DELETE' then
    update public.channels c set subscriber_count = greatest(c.subscriber_count - 1, 0) where c.id = old.channel_id;
  end if;
  return null;
end;
$$;

drop trigger if exists subscriptions_count on public.subscriptions;
create trigger subscriptions_count
  after insert or delete on public.subscriptions
  for each row execute function public.subscriptions_count();

update public.channels c
   set subscriber_count = coalesce((
     select count(*) from public.subscriptions s where s.channel_id = c.id
   ), 0)
 where c.subscriber_count is distinct from coalesce((
     select count(*) from public.subscriptions s where s.channel_id = c.id
   ), 0);

create or replace function public.subscription_change_guard(target uuid, counts boolean, need_flag boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  owner uuid;
  recent int;
begin
  if me is null or not exists (select 1 from public.profiles p where p.id = me) then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  if need_flag and not public.subscriptions_flag_on(me) then
    raise exception 'subscriptions_off' using errcode = 'P0001';
  end if;
  select c.owner_id into owner from public.channels c where c.id = target;
  if owner is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if owner = me then
    raise exception 'own_channel' using errcode = 'P0001';
  end if;
  if counts then
    perform pg_advisory_xact_lock(hashtextextended('subscription_change:' || me::text, 0));
    delete from public.subscription_changes sc
     where sc.subscriber_id = me and sc.at < now() - interval '1 hour';
    select count(*) into recent
      from public.subscription_changes sc
     where sc.subscriber_id = me;
    if recent >= public.subscription_changes_per_hour() then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
    insert into public.subscription_changes (subscriber_id) values (me);
  end if;
  return me;
end;
$$;

drop function if exists public.subscribe(uuid);
drop function if exists public.unsubscribe(uuid);
drop function if exists public.set_notify(uuid, boolean);
drop function if exists public.my_subscriptions();
drop function if exists public.subscriptions_feed(timestamptz, uuid, int, boolean);

create function public.subscribe(channel_id uuid)
returns table (subscribed boolean, notify boolean, subscriber_count int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid;
  already boolean := exists (
    select 1 from public.subscriptions s
    where s.subscriber_id = auth.uid() and s.channel_id = subscribe.channel_id
  );
begin
  me := public.subscription_change_guard(subscribe.channel_id, not already, true);
  insert into public.subscriptions (subscriber_id, channel_id)
  values (me, subscribe.channel_id)
  on conflict on constraint subscriptions_pkey do nothing;
  return query
    select true, s.notify, c.subscriber_count
      from public.subscriptions s
      join public.channels c on c.id = s.channel_id
     where s.subscriber_id = me and s.channel_id = subscribe.channel_id;
end;
$$;

create function public.unsubscribe(channel_id uuid)
returns table (subscribed boolean, notify boolean, subscriber_count int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid;
  there boolean := exists (
    select 1 from public.subscriptions s
    where s.subscriber_id = auth.uid() and s.channel_id = unsubscribe.channel_id
  );
begin
  me := public.subscription_change_guard(unsubscribe.channel_id, there, false);
  delete from public.subscriptions s
   where s.subscriber_id = me and s.channel_id = unsubscribe.channel_id;
  return query
    select false, false, c.subscriber_count
      from public.channels c
     where c.id = unsubscribe.channel_id;
end;
$$;

create function public.set_notify(channel_id uuid, "on" boolean)
returns table (subscribed boolean, notify boolean, subscriber_count int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid;
  current_notify boolean;
  wanted boolean := coalesce(set_notify."on", true);
begin
  select s.notify into current_notify
    from public.subscriptions s
   where s.subscriber_id = auth.uid() and s.channel_id = set_notify.channel_id;
  me := public.subscription_change_guard(
    set_notify.channel_id,
    current_notify is not null and current_notify <> wanted,
    true
  );
  if current_notify is null then
    raise exception 'not_subscribed' using errcode = 'P0001';
  end if;
  update public.subscriptions s
     set notify = wanted
   where s.subscriber_id = me and s.channel_id = set_notify.channel_id;
  return query
    select true, s.notify, c.subscriber_count
      from public.subscriptions s
      join public.channels c on c.id = s.channel_id
     where s.subscriber_id = me and s.channel_id = set_notify.channel_id;
end;
$$;

create function public.my_subscriptions()
returns table (
  channel_id uuid,
  handle text,
  name text,
  avatar_url text,
  notify boolean,
  subscribed_at timestamptz,
  latest_upload_at timestamptz,
  unseen int
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    c.handle,
    coalesce(nullif(c.name, ''), c.handle),
    c.avatar_url,
    s.notify,
    s.created_at,
    (
      select max(v.published_at) from public.videos v
       where v.channel_id = c.id and v.visibility = 'public' and v.status = 'ready'
    ),
    0
  from public.subscriptions s
  join public.channels c on c.id = s.channel_id
  where s.subscriber_id = (select auth.uid())
  order by 7 desc nulls last, 3, 1;
$$;

create function public.subscriptions_feed(
  cursor timestamptz default null,
  cursor_id uuid default null,
  lim int default 24,
  only_notify boolean default false
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
  channel_id uuid,
  channel_handle text,
  channel_name text,
  channel_avatar_url text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    v.id,
    v.title,
    v.duration_s,
    v.thumbnail_url,
    v.hls_key,
    v.preview_sprite_key,
    v.published_at,
    v.views,
    c.id,
    c.handle,
    coalesce(nullif(c.name, ''), c.handle),
    c.avatar_url
  from public.subscriptions s
  join public.channels c on c.id = s.channel_id
  join public.videos v on v.channel_id = s.channel_id
  where s.subscriber_id = (select auth.uid())
    and (not coalesce(subscriptions_feed.only_notify, false) or s.notify)
    and v.visibility = 'public'
    and v.status = 'ready'
    and v.published_at is not null
    and (
      subscriptions_feed.cursor is null
      or (v.published_at, v.id) < (subscriptions_feed.cursor, coalesce(subscriptions_feed.cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
    )
  order by v.published_at desc, v.id desc
  limit least(greatest(coalesce(subscriptions_feed.lim, 24), 1), 50);
$$;

revoke execute on function public.subscriptions_flag_on(uuid) from public, anon, authenticated;
revoke execute on function public.subscription_change_guard(uuid, boolean, boolean) from public, anon, authenticated;
revoke execute on function public.subscriptions_not_own_channel() from public, anon, authenticated;
revoke execute on function public.subscriptions_count() from public, anon, authenticated;

revoke execute on function public.subscribe(uuid) from public;
revoke execute on function public.unsubscribe(uuid) from public;
revoke execute on function public.set_notify(uuid, boolean) from public;
revoke execute on function public.my_subscriptions() from public;
revoke execute on function public.subscriptions_feed(timestamptz, uuid, int, boolean) from public;
grant execute on function public.subscribe(uuid) to authenticated;
grant execute on function public.unsubscribe(uuid) to authenticated;
grant execute on function public.set_notify(uuid, boolean) to authenticated;
grant execute on function public.my_subscriptions() to authenticated;
grant execute on function public.subscriptions_feed(timestamptz, uuid, int, boolean) to authenticated;

insert into public.feature_flags (key, label, description, mode)
values (
  'subscriptions',
  'Subscriptions',
  'Subscribe buttons, the bell, the Subscriptions list in the guide, /feed/subscriptions and the notifications menu.',
  'off'
)
on conflict (key) do nothing;
