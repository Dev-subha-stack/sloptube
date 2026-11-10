create or replace function public.yapin_webhook_is_valid(url text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select url is not null
     and char_length(url) <= 500
     and url ~ '^https://(www\.)?(yapin\.gg|yapper\.website)/api/webhooks/[A-Za-z0-9_-]+/[A-Za-z0-9_.-]+$';
$$;

update public.yapin_posts p
   set status = 'failed', error = 'not a Yapin'' webhook URL', finished_at = now()
  from public.yapin_webhooks w
 where w.id = p.webhook_id
   and p.status in ('queued', 'sending')
   and not public.yapin_webhook_is_valid(w.url);

delete from public.yapin_webhooks w where not public.yapin_webhook_is_valid(w.url);

alter table public.yapin_webhooks drop constraint if exists yapin_webhooks_url_valid;
alter table public.yapin_webhooks add constraint yapin_webhooks_url_valid check (public.yapin_webhook_is_valid(url));

create or replace function public.yapin_is_placeholder_email(email text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select email is not null and email ~* '^yapin_[a-z0-9_-]+@users\.noreply\.[^@[:space:]]+$';
$$;

alter table public.profiles add column if not exists email_placeholder boolean not null default false;

create or replace function public.yapin_mark_placeholder(user_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.profiles p
     set email_placeholder = true
    from auth.users u
   where p.id = yapin_mark_placeholder.user_id
     and u.id = p.id
     and public.yapin_is_placeholder_email(u.email::text);
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.yapin_email_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email and not public.yapin_is_placeholder_email(new.email::text) then
    update public.profiles p set email_placeholder = false where p.id = new.id and p.email_placeholder;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed_yapin on auth.users;
create trigger on_auth_user_email_changed_yapin
  after update of email on auth.users
  for each row execute function public.yapin_email_changed();

drop function if exists public.yapin_find_user(text, text);
drop function if exists public.yapin_find_user(text);
create function public.yapin_find_user(yapin_id text)
returns table (user_id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, u.email::text
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.yapin_id = yapin_find_user.yapin_id
   limit 1;
$$;

create or replace function public.unlink_yapin()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.yapin_caller();
begin
  if exists (select 1 from public.profiles p where p.id = me and p.email_placeholder) then
    raise exception 'needs_email' using errcode = 'P0001';
  end if;
  update public.profiles p set yapin_id = null, yapin_username = null where p.id = me;
end;
$$;

drop function if exists public.yapin_status();
create function public.yapin_status()
returns table (linked boolean, yapin_username text, needs_email boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.yapin_caller();
begin
  return query select p.yapin_id is not null, p.yapin_username, p.email_placeholder from public.profiles p where p.id = me;
end;
$$;

revoke execute on function public.yapin_find_user(text) from public, anon, authenticated;
revoke execute on function public.yapin_mark_placeholder(uuid) from public, anon, authenticated;
revoke execute on function public.yapin_email_changed() from public, anon, authenticated;
revoke execute on function public.unlink_yapin() from public;
revoke execute on function public.yapin_status() from public;

grant execute on function public.yapin_find_user(text) to service_role;
grant execute on function public.yapin_mark_placeholder(uuid) to service_role;
grant execute on function public.unlink_yapin() to authenticated;
grant execute on function public.yapin_status() to authenticated;

create or replace function public.set_feature_flag(p_key text, p_mode text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  row_users uuid[];
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;
  if p_mode is null or p_mode not in ('off', 'test', 'everyone') then
    raise exception 'bad_mode' using errcode = 'P0001';
  end if;

  select f.users into row_users
    from public.feature_flags f
   where f.key = p_key
     for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  if p_mode = 'test' and not (me = any (coalesce(row_users, '{}'::uuid[]))) then
    row_users := coalesce(row_users, '{}'::uuid[]) || me;
  end if;

  update public.feature_flags f
     set mode = p_mode,
         users = coalesce(row_users, '{}'::uuid[])
   where f.key = p_key;

  return jsonb_build_object(
    'key', p_key,
    'mode', p_mode,
    'users', to_jsonb(coalesce(row_users, '{}'::uuid[]))
  );
end;
$$;

revoke execute on function public.set_feature_flag(text, text) from public;
revoke execute on function public.set_feature_flag(text, text) from anon;
grant execute on function public.set_feature_flag(text, text) to authenticated;

insert into public.feature_flags (key, label, description, mode)
values (
  'flag_panel',
  'Flag panel',
  'The floating flags panel for admins, Ctrl+Shift+S (Cmd+Shift+S on a Mac). Each switch changes the real flag in this table.',
  'everyone'
)
on conflict (key) do nothing;

create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text not null check (char_length(description) between 1 and 5000),
  status text not null default 'pending' check (status in ('pending', 'in_review', 'resolved', 'dismissed')),
  admin_notes text default '' check (char_length(coalesce(admin_notes, '')) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on public.bug_reports from anon, authenticated;
grant select, insert, update on public.bug_reports to authenticated;
grant all on public.bug_reports to service_role;

alter table public.bug_reports enable row level security;

create index if not exists bug_reports_reporter_idx on public.bug_reports (reporter_id, created_at desc);
create index if not exists bug_reports_status_idx on public.bug_reports (status, created_at desc);

drop policy if exists "Users can insert their own bug reports" on public.bug_reports;
create policy "Users can insert their own bug reports"
  on public.bug_reports for insert
  to authenticated
  with check (auth.uid() = reporter_id and status = 'pending' and coalesce(admin_notes, '') = '');

drop policy if exists "Users can view their own bug reports" on public.bug_reports;
create policy "Users can view their own bug reports"
  on public.bug_reports for select
  to authenticated
  using (auth.uid() = reporter_id);

drop policy if exists "Staff can view every bug report" on public.bug_reports;
create policy "Staff can view every bug report"
  on public.bug_reports for select
  to authenticated
  using (public.is_admin() or public.has_role(auth.uid(), 'moderator'::public.app_role));

drop policy if exists "Staff can update bug reports" on public.bug_reports;
create policy "Staff can update bug reports"
  on public.bug_reports for update
  to authenticated
  using (public.is_admin() or public.has_role(auth.uid(), 'moderator'::public.app_role))
  with check (public.is_admin() or public.has_role(auth.uid(), 'moderator'::public.app_role));

insert into public.feature_flags (key, label, description, mode)
values (
  'bug_reports',
  'Bug Reports',
  'User-facing bug reporting with status tracking.',
  'everyone'
)
on conflict (key) do nothing;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('comment', 'reply', 'like', 'subscribe')),
  message text not null check (char_length(message) between 1 and 500),
  video_id uuid references public.videos(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read) on public.notifications to authenticated;
grant all on public.notifications to service_role;

alter table public.notifications enable row level security;

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read = false;

drop policy if exists "Users can read their own notifications" on public.notifications;
create policy "Users can read their own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into public.feature_flags (key, label, description, mode)
values (
  'notifications',
  'Notifications',
  'In-app notification bell with comment, reply, like, and subscribe alerts.',
  'everyone'
)
on conflict (key) do nothing;
