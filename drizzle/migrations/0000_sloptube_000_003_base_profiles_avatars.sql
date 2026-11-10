-- Ported from the source project's migrations 000-003. The source ran on a
-- backend where new public tables are granted to the API roles by default and
-- each file then revokes what it must; reproduce that so the source's
-- column-level revokes keep their meaning. RLS is on for every table.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

create extension if not exists pg_cron;

create table if not exists public.app_meta (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
grant select on public.app_meta to anon, authenticated;
grant all on public.app_meta to service_role;

alter table public.app_meta enable row level security;

drop policy if exists "app_meta is readable by everyone" on public.app_meta;
create policy "app_meta is readable by everyone"
  on public.app_meta
  for select
  to anon, authenticated
  using (true);

create table if not exists public.feature_flags (
  key text primary key,
  label text not null default '',
  description text not null default '',
  mode text not null default 'off' check (mode in ('off', 'test', 'everyone')),
  users uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists feature_flags_touch on public.feature_flags;
create trigger feature_flags_touch
  before update on public.feature_flags
  for each row execute function public.touch_updated_at();

alter table public.feature_flags enable row level security;

drop policy if exists "feature_flags are readable by everyone" on public.feature_flags;
create policy "feature_flags are readable by everyone"
  on public.feature_flags
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.feature_flags from anon, authenticated;
grant select on public.feature_flags to anon, authenticated;
grant all on public.feature_flags to service_role;

create or replace function public.username_is_valid(name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select name is not null
    and name ~ '^[a-z0-9_]{3,24}$'
    and name not in (
      'admin', 'administrator', 'api', 'auth', 'channel', 'flags', 'help', 'history',
      'library', 'login', 'logout', 'me', 'moderator', 'null', 'root', 'settings',
      'signup', 'sloptube', 'staff', 'subscriptions', 'support', 'system', 'trending',
      'undefined', 'upload', 'watch', 'welcome'
    );
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text not null default '',
  avatar_url text,
  bio text not null default '',
  birthdate date,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  constraint profiles_username_valid check (public.username_is_valid(username)),
  constraint profiles_display_name_length check (char_length(display_name) <= 50),
  constraint profiles_bio_length check (char_length(bio) <= 1000),
  constraint profiles_avatar_url_https check (avatar_url is null or avatar_url ~ '^https://')
);

create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "profiles are readable by everyone" on public.profiles;
create policy "profiles are readable by everyone"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

drop policy if exists "people update their own profile" on public.profiles;
create policy "people update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke all on public.profiles from anon, authenticated;
grant select (id, username, display_name, avatar_url, bio, onboarded, created_at)
  on public.profiles to anon, authenticated;
grant update (username, display_name, avatar_url, bio)
  on public.profiles to authenticated;
grant all on public.profiles to service_role;

create or replace function public.generate_username(seed text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  base text;
  candidate text;
  tries int := 0;
begin
  base := left(regexp_replace(lower(coalesce(seed, '')), '[^a-z0-9_]', '', 'g'), 16);
  if char_length(base) < 3 then
    base := 'user';
  end if;
  loop
    candidate := base || '_' || lpad(floor(random() * 10000)::int::text, 4, '0');
    exit when public.username_is_valid(candidate)
      and not exists (select 1 from public.profiles p where lower(p.username) = candidate);
    tries := tries + 1;
    if tries > 25 then
      candidate := 'user_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12);
      exit;
    end if;
  end loop;
  return candidate;
end;
$$;

create or replace function public.username_available(name text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.username_is_valid(name)
    and not exists (
      select 1 from public.profiles p
      where lower(p.username) = lower(name)
        and p.id is distinct from (select auth.uid())
    );
$$;

grant execute on function public.username_available(text) to anon, authenticated;

create or replace function public.age_on(birthdate date, today date default current_date)
returns int
language sql
immutable
set search_path = ''
as $$
  select extract(year from age(today, birthdate))::int;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  wanted text := lower(meta ->> 'username');
  claimed_birthdate text := meta ->> 'birthdate';
  chosen text;
  shown text;
  picture text := meta ->> 'avatar_url';
begin
  if claimed_birthdate ~ '^\d{4}-\d{2}-\d{2}$' then
    if public.age_on(claimed_birthdate::date) < 13 then
      raise exception 'too_young' using errcode = 'P0001';
    end if;
  end if;

  if public.username_is_valid(wanted)
     and not exists (select 1 from public.profiles p where lower(p.username) = wanted) then
    chosen := wanted;
  else
    chosen := public.generate_username(
      coalesce(nullif(meta ->> 'full_name', ''), split_part(coalesce(new.email, ''), '@', 1))
    );
  end if;

  shown := left(coalesce(nullif(meta ->> 'full_name', ''), nullif(meta ->> 'name', ''), chosen), 50);

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    chosen,
    shown,
    case when picture ~ '^https://' then picture else null end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.complete_signup(username text, birthdate date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  wanted text := lower(trim(complete_signup.username));
  current_profile public.profiles;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;

  select * into current_profile from public.profiles p where p.id = me;
  if current_profile.onboarded then
    raise exception 'already_complete' using errcode = 'P0001';
  end if;

  if complete_signup.birthdate is null then
    raise exception 'birthdate_required' using errcode = 'P0001';
  end if;
  if complete_signup.birthdate > current_date or complete_signup.birthdate < date '1900-01-01' then
    raise exception 'invalid_birthdate' using errcode = 'P0001';
  end if;
  if public.age_on(complete_signup.birthdate) < 13 then
    raise exception 'too_young' using errcode = 'P0001';
  end if;

  if not public.username_is_valid(wanted) then
    raise exception 'invalid_username' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profiles p where lower(p.username) = wanted and p.id <> me) then
    raise exception 'username_taken' using errcode = 'P0001';
  end if;

  if current_profile.id is null then
    insert into public.profiles (id, username, display_name, birthdate, onboarded)
    values (me, wanted, wanted, complete_signup.birthdate, true);
  else
    update public.profiles p
       set username = wanted,
           birthdate = complete_signup.birthdate,
           onboarded = true
     where p.id = me;
  end if;
end;
$$;

revoke execute on function public.complete_signup(text, date) from public, anon;
grant execute on function public.complete_signup(text, date) to authenticated;

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  delete from auth.users u where u.id = me;
end;
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

revoke execute on function public.generate_username(text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

insert into public.feature_flags (key, label, description, mode)
values (
  'accounts',
  'Accounts',
  'Sign up, sign in, avatar menu and settings. The base for everything else.',
  'everyone'
)
on conflict (key) do nothing;

drop policy if exists "avatars: owners can list their files" on storage.objects;
create policy "avatars: owners can list their files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars: owners can upload" on storage.objects;
create policy "avatars: owners can upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars: owners can replace" on storage.objects;
create policy "avatars: owners can replace"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars: owners can delete" on storage.objects;
create policy "avatars: owners can delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
