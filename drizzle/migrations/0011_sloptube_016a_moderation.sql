create or replace function public.moderation_flag_on(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.feature_flags f
    where f.key = 'moderation'
      and (f.mode = 'everyone' or (f.mode = 'test' and uid = any (f.users)))
  );
$$;

create or replace function public.moderation_strike_days() returns int language sql immutable set search_path = '' as $$ select 90 $$;
create or replace function public.moderation_strike_limit() returns int language sql immutable set search_path = '' as $$ select 3 $$;
create or replace function public.moderation_link_limit() returns int language sql immutable set search_path = '' as $$ select 5 $$;
create or replace function public.moderation_reports_per_day() returns int language sql immutable set search_path = '' as $$ select 10 $$;

create or replace function public.moderation_word_is_valid(word text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select word is not null
     and char_length(word) between 2 and 40
     and word ~ '^[a-z0-9]+([ ''-][a-z0-9]+)*\*?$'
$$;

alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists banned_at timestamptz;
alter table public.profiles add column if not exists ban_reason text;
alter table public.profiles drop constraint if exists profiles_role_valid;
alter table public.profiles add constraint profiles_role_valid check (role in ('user', 'admin'));

alter table public.channels add column if not exists suspended_at timestamptz;
alter table public.channels add column if not exists suspended_reason text;

alter table public.videos add column if not exists removed_at timestamptz;
alter table public.videos add column if not exists removed_reason text;
alter table public.videos add column if not exists removed_visibility text;
alter table public.videos add column if not exists held_visibility text;
alter table public.videos drop constraint if exists videos_moderation_visibility_valid;
alter table public.videos add constraint videos_moderation_visibility_valid check (
  (removed_visibility is null or removed_visibility in ('private', 'unlisted', 'public'))
  and (held_visibility is null or held_visibility in ('private', 'unlisted', 'public'))
);
create index if not exists videos_removed_idx on public.videos (removed_at) where removed_at is not null;

alter table public.comments add column if not exists removed_at timestamptz;

grant select (suspended_at) on public.channels to anon, authenticated;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'report',
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_kind text not null,
  target_id uuid not null,
  reason text not null,
  details text not null default '',
  status text not null default 'open',
  resolution text,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reports_kind_valid check (kind in ('report', 'appeal')),
  constraint reports_target_kind_valid check (target_kind in ('video', 'comment', 'channel')),
  constraint reports_reason_valid check (
    (kind = 'report' and reason in ('spam', 'sexual', 'violent', 'harassment', 'copyright', 'other'))
    or (kind = 'appeal' and reason = 'appeal' and target_kind = 'video')
  ),
  constraint reports_details_length check (char_length(details) <= 500),
  constraint reports_status_valid check (status in ('open', 'dismissed', 'actioned'))
);

create unique index if not exists reports_once_idx on public.reports (reporter_id, target_kind, target_id) where kind = 'report';
create unique index if not exists reports_open_appeal_idx on public.reports (target_id) where kind = 'appeal' and status = 'open';
create index if not exists reports_open_idx on public.reports (created_at desc) where status = 'open';
create index if not exists reports_target_idx on public.reports (target_kind, target_id, kind);
create index if not exists reports_reporter_recent_idx on public.reports (reporter_id, created_at desc);

create table if not exists public.channel_strikes (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  reason text not null default '',
  target_kind text,
  target_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists channel_strikes_recent_idx on public.channel_strikes (channel_id, created_at desc);

create table if not exists public.mod_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_kind text not null,
  target_id uuid,
  target_label text not null default '',
  reason text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists mod_log_recent_idx on public.mod_log (created_at desc, id desc);

create table if not exists public.moderation_words (
  word text primary key,
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint moderation_words_valid check (public.moderation_word_is_valid(word))
);

create table if not exists public.moderation_requests (
  user_id uuid not null,
  bucket text not null,
  at timestamptz not null default now()
);

create index if not exists moderation_requests_recent_idx on public.moderation_requests (user_id, bucket, at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and p.banned_at is null
  );
$$;

alter table public.reports enable row level security;
alter table public.channel_strikes enable row level security;
alter table public.mod_log enable row level security;
alter table public.moderation_words enable row level security;
alter table public.moderation_requests enable row level security;

revoke all on public.reports from anon, authenticated;
revoke all on public.channel_strikes from anon, authenticated;
revoke all on public.mod_log from anon, authenticated;
revoke all on public.moderation_words from anon, authenticated;
revoke all on public.moderation_requests from anon, authenticated;

grant select on public.reports to authenticated;
grant select on public.channel_strikes to authenticated;
grant select on public.mod_log to authenticated;
grant select on public.moderation_words to authenticated;

grant all on public.reports to service_role;
grant all on public.channel_strikes to service_role;
grant all on public.mod_log to service_role;
grant all on public.moderation_words to service_role;
grant all on public.moderation_requests to service_role;

drop policy if exists "people read their own reports" on public.reports;
create policy "people read their own reports"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));

drop policy if exists "admins read every report" on public.reports;
create policy "admins read every report"
  on public.reports for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "owners read their channel strikes" on public.channel_strikes;
create policy "owners read their channel strikes"
  on public.channel_strikes for select to authenticated
  using (exists (select 1 from public.channels c where c.id = channel_id and c.owner_id = (select auth.uid())));

drop policy if exists "admins read every strike" on public.channel_strikes;
create policy "admins read every strike"
  on public.channel_strikes for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "admins read the mod log" on public.mod_log;
create policy "admins read the mod log"
  on public.mod_log for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "admins read the word list" on public.moderation_words;
create policy "admins read the word list"
  on public.moderation_words for select to authenticated
  using ((select public.is_admin()));

create or replace view public.comment_cards
with (security_invoker = true)
as
select
  c.id,
  c.video_id,
  c.parent_id,
  case when c.deleted_at is null then c.body end as body,
  c.like_count,
  c.reply_count,
  c.pinned,
  c.hearted and c.deleted_at is null as hearted,
  c.created_at,
  c.edited_at,
  c.deleted_at is not null as deleted,
  case when c.deleted_at is null then coalesce(ch.handle, p.username) end as author_handle,
  case when c.deleted_at is null then coalesce(nullif(ch.name, ''), nullif(p.display_name, ''), p.username) end as author_name,
  case when c.deleted_at is null then coalesce(ch.avatar_url, p.avatar_url) end as author_avatar_url,
  c.author_id = v.owner_id and c.deleted_at is null as by_owner,
  c.author_id = (select auth.uid()) as mine,
  exists (
    select 1 from public.comment_likes l where l.comment_id = c.id and l.user_id = (select auth.uid())
  ) as liked,
  c.removed_at is not null as removed
from public.comments c
join public.videos v on v.id = c.video_id
join public.profiles p on p.id = c.author_id
left join public.channels ch on ch.owner_id = c.author_id;

revoke all on public.comment_cards from public, anon, authenticated;

create or replace function public.moderation_blocked_word(body text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select w.word
  from public.moderation_words w
  where regexp_replace(lower(coalesce(moderation_blocked_word.body, '')), '\s+', ' ', 'g')
        ~ ('(^|[^a-z0-9])' || rtrim(w.word, '*') || case when w.word like '%*' then '' else '($|[^a-z0-9])' end)
  order by w.word
  limit 1;
$$;

create or replace function public.moderation_link_count(body text)
returns int
language sql
immutable
set search_path = ''
as $$
  select count(*)::int from regexp_matches(coalesce(moderation_link_count.body, ''), '(https?://\S+|www\.\S+)', 'gi');
$$;

create or replace function public.moderation_block_for(uid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.profiles p where p.id = uid and p.banned_at is not null) then 'banned'
    when exists (select 1 from public.channels c where c.owner_id = uid and c.suspended_at is not null) then 'suspended'
  end;
$$;

create or replace function public.comments_moderation_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  block text;
begin
  if new.deleted_at is not null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.body is not distinct from old.body then
    return new;
  end if;
  block := public.moderation_block_for(new.author_id);
  if block is not null then
    raise exception '%', block using errcode = 'P0001';
  end if;
  if public.moderation_flag_on(new.author_id) then
    if public.moderation_blocked_word(new.body) is not null then
      raise exception 'blocked_words' using errcode = 'P0001';
    end if;
    if public.moderation_link_count(new.body) > public.moderation_link_limit() then
      raise exception 'too_many_links' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists comments_moderation_guard on public.comments;
create trigger comments_moderation_guard
  before insert or update of body, deleted_at on public.comments
  for each row execute function public.comments_moderation_guard();

create or replace function public.videos_moderation_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  block text;
begin
  if tg_op = 'INSERT' then
    block := public.moderation_block_for(new.owner_id);
    if block is not null then
      raise exception '%', block using errcode = 'P0001';
    end if;
  end if;
  if (tg_op = 'INSERT' or new.title is distinct from old.title or new.description is distinct from old.description)
     and public.moderation_flag_on(new.owner_id)
     and public.moderation_blocked_word(coalesce(new.title, '') || ' ' || coalesce(new.description, '')) is not null then
    raise exception 'blocked_words' using errcode = 'P0001';
  end if;
  if new.visibility <> 'private' then
    if new.removed_at is not null then
      raise exception 'removed' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.channels c where c.id = new.channel_id and c.suspended_at is not null) then
      raise exception 'suspended' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists videos_moderation_guard on public.videos;
create trigger videos_moderation_guard
  before insert or update of title, description, visibility, removed_at on public.videos
  for each row execute function public.videos_moderation_guard();

create or replace function public.moderation_pre_request()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is not null and exists (select 1 from public.profiles p where p.id = me and p.banned_at is not null) then
    raise exception 'banned' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.moderation_throttle(who uuid, bucket text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  recent int;
begin
  perform pg_advisory_xact_lock(hashtextextended('moderation:' || bucket || ':' || who::text, 0));
  delete from public.moderation_requests r
   where r.user_id = who and r.bucket = moderation_throttle.bucket and r.at < now() - interval '1 minute';
  select count(*) into recent from public.moderation_requests r where r.user_id = who and r.bucket = moderation_throttle.bucket;
  if recent >= 120 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.moderation_requests (user_id, bucket) values (who, moderation_throttle.bucket);
end;
$$;

create or replace function public.moderation_caller()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  if not public.moderation_flag_on(me) then
    raise exception 'moderation_off' using errcode = 'P0001';
  end if;
  return me;
end;
$$;

create or replace function public.moderation_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := public.moderation_caller();
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;
  return me;
end;
$$;

create or replace function public.channel_active_strikes(channel_id uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.channel_strikes s
  where s.channel_id = channel_active_strikes.channel_id
    and s.created_at > now() - make_interval(days => public.moderation_strike_days());
$$;

create or replace function public.mod_write_log(actor uuid, action text, target_kind text, target_id uuid, label text, reason text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.mod_log (actor_id, action, target_kind, target_id, target_label, reason, created_at)
  values (actor, action, target_kind, target_id, left(coalesce(label, ''), 200), left(coalesce(reason, ''), 500), clock_timestamp());
$$;
