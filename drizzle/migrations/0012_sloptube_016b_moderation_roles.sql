do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'app_role' and n.nspname = 'public') then
    create type public.app_role as enum ('admin', 'moderator', 'user');
  end if;
end;
$$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

drop policy if exists "people read their own roles" on public.user_roles;
create policy "people read their own roles"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = _user_id and r.role = _role
  );
$$;

insert into public.user_roles (user_id, role)
select p.id, 'admin'::public.app_role
from public.profiles p
where p.role = 'admin'
  and exists (select 1 from auth.users u where u.id = p.id)
on conflict (user_id, role) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role((select auth.uid()), 'admin'::public.app_role)
     and not exists (
       select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.banned_at is not null
     );
$$;

create or replace function public.mod_suspend_channel(ch uuid, why text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.channels c set suspended_at = now(), suspended_reason = left(coalesce(why, ''), 500)
   where c.id = ch and c.suspended_at is null;
  if not found then
    return false;
  end if;
  update public.videos v set held_visibility = v.visibility, visibility = 'private'
   where v.channel_id = ch and v.visibility <> 'private' and v.held_visibility is null;
  return true;
end;
$$;

create or replace function public.mod_unsuspend_channel(ch uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.channels c set suspended_at = null, suspended_reason = null
   where c.id = ch and c.suspended_at is not null;
  if not found then
    return false;
  end if;
  update public.videos v set trash_visibility = v.held_visibility, held_visibility = null
   where v.channel_id = ch and v.held_visibility is not null and v.deleted_at is not null;
  update public.videos v set visibility = v.held_visibility, held_visibility = null
   where v.channel_id = ch and v.held_visibility is not null and v.deleted_at is null and v.removed_at is null;
  return true;
end;
$$;

drop function if exists public.moderation_status();
drop function if exists public.report_target(text, uuid, text, text);
drop function if exists public.appeal_removal(uuid, text);

create function public.moderation_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'admin', public.is_admin(),
    'flag', public.moderation_flag_on((select auth.uid())),
    'banned', coalesce((select p.banned_at is not null from public.profiles p where p.id = (select auth.uid())), false),
    'suspended', coalesce((select c.suspended_at is not null from public.channels c where c.owner_id = (select auth.uid())), false),
    'suspended_reason', (select c.suspended_reason from public.channels c where c.owner_id = (select auth.uid())),
    'strikes', coalesce((select public.channel_active_strikes(c.id) from public.channels c where c.owner_id = (select auth.uid())), 0),
    'strike_limit', public.moderation_strike_limit(),
    'strike_days', public.moderation_strike_days(),
    'next_strike_expiry', (
      select min(s.created_at) + make_interval(days => public.moderation_strike_days())
      from public.channel_strikes s join public.channels c on c.id = s.channel_id
      where c.owner_id = (select auth.uid())
        and s.created_at > now() - make_interval(days => public.moderation_strike_days())
    )
  );
$$;

create function public.report_target(target_kind text, target_id uuid, reason text, details text default '')
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.moderation_caller();
  clean text := btrim(coalesce(report_target.details, ''));
  owner uuid;
  today int;
  new_id uuid;
begin
  if report_target.target_kind is null or report_target.target_kind not in ('video', 'comment', 'channel') then
    raise exception 'bad_kind' using errcode = 'P0001';
  end if;
  if report_target.reason is null or report_target.reason not in ('spam', 'sexual', 'violent', 'harassment', 'copyright', 'other') then
    raise exception 'bad_reason' using errcode = 'P0001';
  end if;
  if char_length(clean) > 500 then
    raise exception 'details_too_long' using errcode = 'P0001';
  end if;
  if report_target.reason = 'other' and char_length(clean) = 0 then
    raise exception 'details_required' using errcode = 'P0001';
  end if;

  if report_target.target_kind = 'video' then
    select v.owner_id into owner from public.videos v
     where v.id = report_target.target_id and v.status = 'ready' and v.visibility in ('public', 'unlisted') and v.removed_at is null;
  elsif report_target.target_kind = 'comment' then
    select c.author_id into owner from public.comments c join public.videos v on v.id = c.video_id
     where c.id = report_target.target_id and c.deleted_at is null and v.visibility in ('public', 'unlisted') and v.status = 'ready';
  else
    select c.owner_id into owner from public.channels c where c.id = report_target.target_id;
  end if;
  if owner is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if owner = me then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('report:' || me::text, 0));
  if exists (
    select 1 from public.reports r
    where r.reporter_id = me and r.kind = 'report'
      and r.target_kind = report_target.target_kind and r.target_id = report_target.target_id
  ) then
    raise exception 'already_reported' using errcode = 'P0001';
  end if;
  select count(*) into today from public.reports r
   where r.reporter_id = me and r.kind = 'report' and r.created_at > now() - interval '1 day';
  if today >= public.moderation_reports_per_day() then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.reports (kind, reporter_id, target_kind, target_id, reason, details)
  values ('report', me, report_target.target_kind, report_target.target_id, report_target.reason, clean)
  returning id into new_id;
  return new_id;
end;
$$;

create function public.appeal_removal(video_id uuid, details text default '')
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.moderation_caller();
  clean text := btrim(coalesce(appeal_removal.details, ''));
  v public.videos;
  new_id uuid;
begin
  if char_length(clean) > 500 then
    raise exception 'details_too_long' using errcode = 'P0001';
  end if;
  select * into v from public.videos x where x.id = appeal_removal.video_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v.owner_id <> me then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if v.removed_at is null then
    raise exception 'not_removed' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.reports r
    where r.kind = 'appeal' and r.target_id = v.id and (r.status = 'open' or r.created_at >= v.removed_at)
  ) then
    raise exception 'already_appealed' using errcode = 'P0001';
  end if;
  insert into public.reports (kind, reporter_id, target_kind, target_id, reason, details)
  values ('appeal', me, 'video', v.id, 'appeal', clean)
  returning id into new_id;
  return new_id;
end;
$$;

drop function if exists public.studio_videos(boolean);
create function public.studio_videos(trash boolean default false)
returns table (
  id uuid,
  title text,
  description text,
  visibility text,
  status text,
  is_short boolean,
  short_choice boolean,
  duration_s numeric,
  thumbnail_url text,
  thumbnail_name text,
  hls_key text,
  tags text[],
  comments_mode text,
  created_at timestamptz,
  published_at timestamptz,
  views bigint,
  like_count bigint,
  comment_count bigint,
  deleted_at timestamptz,
  trash_visibility text,
  purge_at timestamptz,
  removed_at timestamptz,
  removed_reason text,
  appeal text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := public.studio_caller();
begin
  return query
  select
    v.id, v.title, v.description, v.visibility, v.status, v.is_short, v.short_choice, v.duration_s,
    v.thumbnail_url, v.thumbnail_name, v.hls_key, v.tags, v.comments_mode, v.created_at, v.published_at,
    v.views::bigint, v.like_count::bigint, v.comment_count::bigint, v.deleted_at, v.trash_visibility,
    least(v.deleted_at, v.removed_at) + make_interval(days => public.studio_trash_days()),
    v.removed_at, v.removed_reason,
    (select r.status from public.reports r
      where r.kind = 'appeal' and r.target_id = v.id and v.removed_at is not null and r.created_at >= v.removed_at
      order by r.created_at desc limit 1)
  from public.videos v
  where v.owner_id = me
    and (v.deleted_at is not null) = coalesce(studio_videos.trash, false)
  order by coalesce(v.deleted_at, v.created_at) desc, v.id desc
  limit 500;
end;
$$;

create or replace function public.purge_trash(lim int default 500)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  gone int := 0;
  cutoff timestamptz := now() - make_interval(days => public.studio_trash_days());
begin
  with old as (
    select v.id, v.owner_id
    from public.videos v
    where (v.deleted_at is not null and v.deleted_at < cutoff)
       or (v.removed_at is not null and v.removed_at < cutoff)
    order by least(v.deleted_at, v.removed_at)
    limit least(greatest(coalesce(purge_trash.lim, 500), 1), 5000)
    for update skip locked
  ),
  queued as (
    insert into public.storage_cleanup (video_id, prefix)
    select o.id, p.prefix
    from old o
    cross join lateral (values
      ('hls/' || o.id::text || '/'),
      ('uploads/' || o.owner_id::text || '/' || o.id::text || '/')
    ) as p(prefix)
    on conflict on constraint storage_cleanup_once do update
      set status = 'queued', attempts = 0, error = null, queued_at = now()
    returning 1
  ),
  deleted as (
    delete from public.videos v using old o where v.id = o.id
    returning 1
  )
  select count(*) into gone from deleted;

  delete from public.storage_cleanup c where c.status = 'done' and c.finished_at < now() - interval '30 days';
  return gone;
end;
$$;

drop function if exists public.admin_reports(int);
drop function if exists public.mod_action(text, text, uuid, text, text);
drop function if exists public.admin_log(timestamptz, int);
drop function if exists public.admin_suspended();
drop function if exists public.admin_words();
drop function if exists public.admin_set_word(text, boolean);

create function public.admin_reports(lim int default 1000)
returns table (
  id uuid,
  kind text,
  target_kind text,
  target_id uuid,
  reason text,
  details text,
  created_at timestamptz,
  reporter_name text,
  target_label text,
  video_id uuid,
  channel_id uuid,
  channel_handle text,
  channel_name text,
  channel_suspended boolean,
  channel_strikes int,
  owner_banned boolean,
  owner_admin boolean,
  target_removed boolean,
  target_gone boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.moderation_admin();
  return query
  with r as (
    select x.* from public.reports x
    where x.status = 'open'
    order by x.created_at desc, x.id desc
    limit least(greatest(coalesce(admin_reports.lim, 1000), 1), 2000)
  ),
  t as (
    select
      r.id as report_id,
      case r.target_kind
        when 'video' then vv.owner_id
        when 'comment' then cm.author_id
        else cc.owner_id
      end as owner_id,
      case r.target_kind
        when 'video' then vv.title
        when 'comment' then left(cm.body, 200)
        else coalesce(nullif(cc.name, ''), cc.handle)
      end as label,
      case r.target_kind when 'video' then vv.id when 'comment' then cm.video_id end as video_id,
      case r.target_kind
        when 'video' then vv.removed_at is not null
        when 'comment' then cm.removed_at is not null
        else false
      end as removed,
      case r.target_kind
        when 'video' then vv.id is null
        when 'comment' then cm.id is null or (cm.deleted_at is not null and cm.removed_at is null)
        else cc.id is null
      end as gone
    from r
    left join public.videos vv on r.target_kind = 'video' and vv.id = r.target_id
    left join public.comments cm on r.target_kind = 'comment' and cm.id = r.target_id
    left join public.channels cc on r.target_kind = 'channel' and cc.id = r.target_id
  )
  select
    r.id, r.kind, r.target_kind, r.target_id, r.reason, r.details, r.created_at,
    coalesce(nullif(rp.display_name, ''), rp.username),
    t.label, t.video_id,
    ch.id, ch.handle, coalesce(nullif(ch.name, ''), ch.handle),
    ch.suspended_at is not null,
    case when ch.id is null then 0 else public.channel_active_strikes(ch.id) end,
    coalesce(op.banned_at is not null, false),
    coalesce(public.has_role(t.owner_id, 'admin'::public.app_role), false),
    t.removed, t.gone
  from r
  join t on t.report_id = r.id
  left join public.profiles rp on rp.id = r.reporter_id
  left join public.profiles op on op.id = t.owner_id
  left join public.channels ch on ch.owner_id = t.owner_id
  order by r.created_at desc, r.id desc;
end;
$$;

create function public.mod_action(
  action text,
  target_kind text,
  target_id uuid,
  reason text default '',
  kind text default 'report'
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.moderation_admin();
  why text := btrim(coalesce(mod_action.reason, ''));
  owner uuid;
  ch public.channels;
  vid public.videos;
  com public.comments;
  label text;
  closed int := 0;
  now_suspended boolean := false;
begin
  if mod_action.action is null or mod_action.action not in ('dismiss', 'remove', 'restore', 'strike', 'suspend', 'unsuspend', 'ban', 'unban') then
    raise exception 'bad_action' using errcode = 'P0001';
  end if;
  if mod_action.target_kind is null or mod_action.target_kind not in ('video', 'comment', 'channel')
     or mod_action.kind is null or mod_action.kind not in ('report', 'appeal') then
    raise exception 'bad_kind' using errcode = 'P0001';
  end if;
  if char_length(why) > 500 then
    raise exception 'reason_too_long' using errcode = 'P0001';
  end if;
  if mod_action.action in ('remove', 'strike', 'suspend', 'ban') and char_length(why) = 0 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  perform public.moderation_throttle(me, 'admin');

  if mod_action.target_kind = 'video' then
    select * into vid from public.videos v where v.id = mod_action.target_id for update;
    owner := vid.owner_id;
    label := vid.title;
  elsif mod_action.target_kind = 'comment' then
    select * into com from public.comments c where c.id = mod_action.target_id for update;
    owner := com.author_id;
    label := left(com.body, 200);
  else
    select c.owner_id into owner from public.channels c where c.id = mod_action.target_id;
  end if;
  select * into ch from public.channels c where c.owner_id = owner for update;
  if mod_action.target_kind = 'channel' then
    label := coalesce(nullif(ch.name, ''), ch.handle);
  end if;

  if owner is null and mod_action.action <> 'dismiss' then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if mod_action.action in ('strike', 'suspend', 'ban')
     and (owner = me or public.has_role(owner, 'admin'::public.app_role)) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;

  if mod_action.action = 'remove' then
    if mod_action.target_kind = 'video' then
      if vid.removed_at is null then
        update public.videos v
           set removed_visibility = coalesce(v.held_visibility, v.visibility), held_visibility = null,
               visibility = 'private', removed_at = now(), removed_reason = why
         where v.id = vid.id;
      end if;
      perform public.mod_write_log(me, 'remove_video', 'video', vid.id, label, why);
    elsif mod_action.target_kind = 'comment' then
      if com.removed_at is null then
        update public.comments c
           set removed_at = now(), deleted_at = coalesce(c.deleted_at, now()), body = '', pinned = false, hearted = false
         where c.id = com.id;
      end if;
      perform public.mod_write_log(me, 'remove_comment', 'comment', com.id, label, why);
    else
      raise exception 'bad_action' using errcode = 'P0001';
    end if;
  elsif mod_action.action = 'restore' then
    if mod_action.target_kind <> 'video' then
      raise exception 'bad_action' using errcode = 'P0001';
    end if;
    if vid.removed_at is null then
      raise exception 'not_removed' using errcode = 'P0001';
    end if;
    if ch.suspended_at is not null then
      update public.videos v
         set removed_at = null, removed_reason = null,
             held_visibility = nullif(v.removed_visibility, 'private'), removed_visibility = null
       where v.id = vid.id;
    else
      update public.videos v
         set removed_at = null, removed_reason = null, removed_visibility = null
       where v.id = vid.id;
      update public.videos v set visibility = coalesce(vid.removed_visibility, 'private')
       where v.id = vid.id and v.deleted_at is null;
      update public.videos v set trash_visibility = coalesce(vid.removed_visibility, 'private')
       where v.id = vid.id and v.deleted_at is not null;
    end if;
    perform public.mod_write_log(me, 'restore_video', 'video', vid.id, label, why);
  elsif mod_action.action = 'strike' then
    insert into public.channel_strikes (channel_id, actor_id, reason, target_kind, target_id)
    values (ch.id, me, why, mod_action.target_kind, mod_action.target_id);
    perform public.mod_write_log(me, 'strike', 'channel', ch.id, coalesce(nullif(ch.name, ''), ch.handle), why);
    if public.channel_active_strikes(ch.id) >= public.moderation_strike_limit()
       and public.mod_suspend_channel(ch.id, why) then
      perform public.mod_write_log(me, 'suspend', 'channel', ch.id, coalesce(nullif(ch.name, ''), ch.handle),
        public.moderation_strike_limit() || ' strikes in ' || public.moderation_strike_days() || ' days');
    end if;
  elsif mod_action.action = 'suspend' then
    perform public.mod_suspend_channel(ch.id, why);
    perform public.mod_write_log(me, 'suspend', 'channel', ch.id, coalesce(nullif(ch.name, ''), ch.handle), why);
  elsif mod_action.action = 'unsuspend' then
    perform public.mod_unsuspend_channel(ch.id);
    perform public.mod_write_log(me, 'unsuspend', 'channel', ch.id, coalesce(nullif(ch.name, ''), ch.handle), why);
  elsif mod_action.action = 'ban' then
    update public.profiles p set banned_at = coalesce(p.banned_at, now()), ban_reason = why where p.id = owner;
    perform public.mod_suspend_channel(ch.id, why);
    perform public.mod_write_log(me, 'ban', 'user', owner,
      coalesce((select p.username from public.profiles p where p.id = owner), ''), why);
  elsif mod_action.action = 'unban' then
    update public.profiles p set banned_at = null, ban_reason = null where p.id = owner;
    perform public.mod_write_log(me, 'unban', 'user', owner,
      coalesce((select p.username from public.profiles p where p.id = owner), ''), why);
  else
    perform public.mod_write_log(me, 'dismiss', mod_action.target_kind, mod_action.target_id, coalesce(label, ''), why);
  end if;

  if mod_action.action in ('dismiss', 'remove', 'restore', 'strike', 'suspend', 'ban') then
    update public.reports r
       set status = case when mod_action.action = 'dismiss' then 'dismissed' else 'actioned' end,
           resolution = mod_action.action, resolved_by = me, resolved_at = now()
     where r.status = 'open' and r.kind = mod_action.kind
       and r.target_kind = mod_action.target_kind and r.target_id = mod_action.target_id;
    get diagnostics closed = row_count;
  end if;

  select c.suspended_at is not null into now_suspended from public.channels c where c.id = ch.id;
  return jsonb_build_object('closed', closed, 'suspended', coalesce(now_suspended, false));
end;
$$;

create function public.admin_log(before timestamptz default null, lim int default 50)
returns table (
  id uuid,
  created_at timestamptz,
  action text,
  target_kind text,
  target_id uuid,
  target_label text,
  reason text,
  actor_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.moderation_admin();
  return query
  select l.id, l.created_at, l.action, l.target_kind, l.target_id, l.target_label, l.reason,
         coalesce(nullif(p.display_name, ''), p.username, 'deleted account')
  from public.mod_log l
  left join public.profiles p on p.id = l.actor_id
  where admin_log.before is null or l.created_at < admin_log.before
  order by l.created_at desc, l.id desc
  limit least(greatest(coalesce(admin_log.lim, 50), 1), 100);
end;
$$;

create function public.admin_suspended()
returns table (
  channel_id uuid,
  handle text,
  name text,
  suspended_at timestamptz,
  reason text,
  strikes int,
  banned boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.moderation_admin();
  return query
  select c.id, c.handle, coalesce(nullif(c.name, ''), c.handle), c.suspended_at, coalesce(c.suspended_reason, ''),
         public.channel_active_strikes(c.id), p.banned_at is not null
  from public.channels c
  join public.profiles p on p.id = c.owner_id
  where c.suspended_at is not null
  order by c.suspended_at desc
  limit 200;
end;
$$;

create function public.admin_words()
returns table (word text, created_at timestamptz, added_by text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.moderation_admin();
  return query
  select w.word, w.created_at, coalesce(p.username, '')
  from public.moderation_words w
  left join public.profiles p on p.id = w.added_by
  order by w.word;
end;
$$;

create function public.admin_set_word(word text, "on" boolean default true)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.moderation_admin();
  w text := admin_set_word.word;
begin
  if not public.moderation_word_is_valid(w) then
    raise exception 'bad_word' using errcode = 'P0001';
  end if;
  perform public.moderation_throttle(me, 'admin');
  if coalesce(admin_set_word."on", true) then
    insert into public.moderation_words (word, added_by) values (w, me) on conflict on constraint moderation_words_pkey do nothing;
    if found then
      perform public.mod_write_log(me, 'add_word', 'word', null, w, '');
    end if;
  else
    delete from public.moderation_words x where x.word = w;
    if found then
      perform public.mod_write_log(me, 'remove_word', 'word', null, w, '');
    end if;
  end if;
end;
$$;

comment on column public.profiles.role is 'DEPRECATED: roles live in public.user_roles; never read this column for authorization';
revoke update (role) on public.profiles from anon, authenticated;
revoke insert (role) on public.profiles from anon, authenticated;

revoke execute on function public.moderation_flag_on(uuid) from public, anon, authenticated;
revoke execute on function public.moderation_blocked_word(text) from public, anon, authenticated;
revoke execute on function public.moderation_block_for(uuid) from public, anon, authenticated;
revoke execute on function public.comments_moderation_guard() from public, anon, authenticated;
revoke execute on function public.videos_moderation_guard() from public, anon, authenticated;
revoke execute on function public.moderation_throttle(uuid, text) from public, anon, authenticated;
revoke execute on function public.moderation_caller() from public, anon, authenticated;
revoke execute on function public.moderation_admin() from public, anon, authenticated;
revoke execute on function public.channel_active_strikes(uuid) from public, anon, authenticated;
revoke execute on function public.mod_write_log(uuid, text, text, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.mod_suspend_channel(uuid, text) from public, anon, authenticated;
revoke execute on function public.mod_unsuspend_channel(uuid) from public, anon, authenticated;
revoke execute on function public.purge_trash(int) from public, anon, authenticated;

revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
revoke execute on function public.moderation_pre_request() from public;
grant execute on function public.moderation_pre_request() to anon, authenticated, service_role;

revoke execute on function public.moderation_status() from public;
revoke execute on function public.report_target(text, uuid, text, text) from public;
revoke execute on function public.appeal_removal(uuid, text) from public;
revoke execute on function public.studio_videos(boolean) from public;
revoke execute on function public.admin_reports(int) from public;
revoke execute on function public.mod_action(text, text, uuid, text, text) from public;
revoke execute on function public.admin_log(timestamptz, int) from public;
revoke execute on function public.admin_suspended() from public;
revoke execute on function public.admin_words() from public;
revoke execute on function public.admin_set_word(text, boolean) from public;

grant execute on function public.moderation_status() to anon, authenticated;
grant execute on function public.report_target(text, uuid, text, text) to authenticated;
grant execute on function public.appeal_removal(uuid, text) to authenticated;
grant execute on function public.studio_videos(boolean) to authenticated;
grant execute on function public.admin_reports(int) to authenticated;
grant execute on function public.mod_action(text, text, uuid, text, text) to authenticated;
grant execute on function public.admin_log(timestamptz, int) to authenticated;
grant execute on function public.admin_suspended() to authenticated;
grant execute on function public.admin_words() to authenticated;
grant execute on function public.admin_set_word(text, boolean) to authenticated;

grant execute on function public.purge_trash(int) to service_role;

insert into public.feature_flags (key, label, description, mode)
values (
  'moderation',
  'Moderation',
  'Report buttons on videos, comments and channels, the admin queue at /admin with the mod log and the word list, strikes, suspensions, bans, removed videos with appeals.',
  'off'
)
on conflict (key) do nothing;
