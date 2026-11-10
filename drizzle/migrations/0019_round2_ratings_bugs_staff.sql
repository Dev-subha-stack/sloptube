-- Star ratings
create table if not exists public.video_ratings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, video_id)
);
create index if not exists video_ratings_video_idx on public.video_ratings (video_id);
create index if not exists video_ratings_user_recent_idx on public.video_ratings (user_id, updated_at desc);
grant select on public.video_ratings to authenticated;
grant all on public.video_ratings to service_role;
alter table public.video_ratings enable row level security;
create policy "people read their own ratings" on public.video_ratings for select to authenticated using (auth.uid() = user_id);

create table if not exists public.video_rating_totals (
  video_id uuid primary key references public.videos(id) on delete cascade,
  ratings integer not null default 0,
  stars_sum bigint not null default 0,
  updated_at timestamptz not null default now()
);
grant select on public.video_rating_totals to anon, authenticated;
grant all on public.video_rating_totals to service_role;
alter table public.video_rating_totals enable row level security;
create policy "rating totals are public" on public.video_rating_totals for select to anon, authenticated using (true);

create or replace function public.video_ratings_total()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    insert into public.video_rating_totals as t (video_id, ratings, stars_sum)
    values (new.video_id, 0, 0) on conflict (video_id) do nothing;
  end if;
  if tg_op = 'INSERT' then
    update public.video_rating_totals t set ratings = t.ratings + 1, stars_sum = t.stars_sum + new.stars, updated_at = now() where t.video_id = new.video_id;
  elsif tg_op = 'UPDATE' then
    update public.video_rating_totals t set stars_sum = t.stars_sum - old.stars + new.stars, updated_at = now() where t.video_id = new.video_id;
  else
    update public.video_rating_totals t set ratings = greatest(t.ratings - 1, 0), stars_sum = greatest(t.stars_sum - old.stars, 0), updated_at = now() where t.video_id = old.video_id;
  end if;
  return null;
end;
$$;
drop trigger if exists video_ratings_total on public.video_ratings;
create trigger video_ratings_total after insert or update or delete on public.video_ratings
for each row execute function public.video_ratings_total();

create or replace function public.video_rating(video_id uuid)
returns table (my_stars integer, average numeric, ratings integer)
language sql stable security definer set search_path = '' as $$
  select
    (select r.stars::int from public.video_ratings r where r.user_id = auth.uid() and r.video_id = video_rating.video_id),
    coalesce((select round(t.stars_sum::numeric / nullif(t.ratings, 0), 2) from public.video_rating_totals t where t.video_id = video_rating.video_id), 0),
    coalesce((select t.ratings from public.video_rating_totals t where t.video_id = video_rating.video_id), 0);
$$;
grant execute on function public.video_rating(uuid) to anon, authenticated;

create or replace function public.rate_video(video_id uuid, stars integer)
returns table (my_stars integer, average numeric, ratings integer)
language plpgsql security definer set search_path = '' as $$
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
    on conflict (user_id, video_id) do update set stars = excluded.stars, updated_at = now()
      where r.stars is distinct from excluded.stars;
  end if;
  return query select * from public.video_rating(v.id);
end;
$$;
grant execute on function public.rate_video(uuid, integer) to authenticated;

create or replace function public.top_rated_videos(lim integer default 24)
returns table (id uuid, title text, duration_s numeric, thumbnail_url text, hls_key text, preview_sprite_key text,
  published_at timestamptz, views bigint, channel_id uuid, channel_handle text, channel_name text, channel_avatar_url text,
  is_short boolean, average numeric, ratings integer)
language sql stable security definer set search_path = '' as $$
  select v.id, v.title, v.duration_s, v.thumbnail_url, v.hls_key, v.preview_sprite_key, v.published_at, v.views,
    c.id, c.handle, coalesce(nullif(c.name, ''), c.handle), c.avatar_url, v.is_short,
    round(t.stars_sum::numeric / t.ratings, 2), t.ratings
  from public.video_rating_totals t
  join public.videos v on v.id = t.video_id
  join public.channels c on c.id = v.channel_id
  where t.ratings > 0 and v.status = 'ready' and v.visibility = 'public'
    and v.deleted_at is null and v.removed_at is null and c.suspended_at is null
  order by (t.stars_sum + 6)::numeric / (t.ratings + 2) desc, t.ratings desc, v.published_at desc
  limit least(greatest(coalesce(lim, 24), 1), 100);
$$;
grant execute on function public.top_rated_videos(integer) to anon, authenticated;

create or replace function public.my_ratings(lim integer default 50)
returns table (id uuid, title text, duration_s numeric, thumbnail_url text, hls_key text, preview_sprite_key text,
  published_at timestamptz, views bigint, channel_id uuid, channel_handle text, channel_name text, channel_avatar_url text,
  is_short boolean, stars integer, rated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select v.id, v.title, v.duration_s, v.thumbnail_url, v.hls_key, v.preview_sprite_key, v.published_at, v.views,
    c.id, c.handle, coalesce(nullif(c.name, ''), c.handle), c.avatar_url, v.is_short,
    r.stars::int, r.updated_at
  from public.video_ratings r
  join public.videos v on v.id = r.video_id
  join public.channels c on c.id = v.channel_id
  where r.user_id = auth.uid() and v.deleted_at is null
    and (v.owner_id = auth.uid() or (v.status = 'ready' and v.visibility in ('public', 'unlisted')))
  order by r.updated_at desc
  limit least(greatest(coalesce(lim, 50), 1), 200);
$$;
grant execute on function public.my_ratings(integer) to authenticated;

-- Bug reports: grants, staff replies, status notifications
grant select, insert on public.bug_reports to authenticated;
grant update (status, admin_notes, updated_at) on public.bug_reports to authenticated;
grant all on public.bug_reports to service_role;

create table if not exists public.bug_report_comments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.bug_reports(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists bug_report_comments_report_idx on public.bug_report_comments (report_id, created_at);
grant select, insert on public.bug_report_comments to authenticated;
grant all on public.bug_report_comments to service_role;
alter table public.bug_report_comments enable row level security;
create policy "reporter and staff read bug comments" on public.bug_report_comments for select to authenticated
  using (public.is_staff() or exists (select 1 from public.bug_reports b where b.id = report_id and b.reporter_id = auth.uid()));
create policy "reporter and staff add bug comments" on public.bug_report_comments for insert to authenticated
  with check (author_id = auth.uid()
    and (public.is_staff() or exists (select 1 from public.bug_reports b where b.id = report_id and b.reporter_id = auth.uid())));

create or replace function public.notify_bug_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  b public.bug_reports;
  label text;
begin
  if tg_table_name = 'bug_report_comments' then
    select * into b from public.bug_reports x where x.id = new.report_id;
    if b.id is not null and b.reporter_id <> new.author_id then
      insert into public.notifications (user_id, type, message, actor_id, bug_report_id)
      values (b.reporter_id, 'bug', left('Staff replied to your bug report "' || b.title || '"', 500), new.author_id, b.id);
    end if;
  elsif new.status is distinct from old.status then
    label := case new.status when 'in_review' then 'is being checked' when 'resolved' then 'was fixed'
      when 'dismissed' then 'was closed' else 'is pending' end;
    insert into public.notifications (user_id, type, message, actor_id, bug_report_id)
    values (new.reporter_id, 'bug', left('Your bug report "' || new.title || '" ' || label, 500), auth.uid(), new.id);
  end if;
  return new;
exception when others then
  return new;
end;
$$;
drop trigger if exists bug_comments_notify on public.bug_report_comments;
create trigger bug_comments_notify after insert on public.bug_report_comments
for each row execute function public.notify_bug_update();
drop trigger if exists bug_status_notify on public.bug_reports;
create trigger bug_status_notify after update of status on public.bug_reports
for each row execute function public.notify_bug_update();

-- Admin: every account
create or replace function public.admin_users(q text default '', lim integer default 50, off integer default 0)
returns table (id uuid, email text, username text, display_name text, avatar_url text, created_at timestamptz,
  last_sign_in_at timestamptz, banned_at timestamptz, ban_reason text, roles text[], channel_id uuid, channel_handle text,
  video_count bigint, subscriber_count integer, is_owner boolean, total bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  term text := lower(btrim(coalesce(q, '')));
begin
  if not public.is_admin() then raise exception 'not_admin' using errcode = 'P0001'; end if;
  return query
  with base as (
    select p.*, u.email as u_email, u.last_sign_in_at as u_last
    from public.profiles p join auth.users u on u.id = p.id
    where term = '' or lower(p.username) like '%' || term || '%' or lower(p.display_name) like '%' || term || '%'
       or lower(coalesce(u.email, '')) like '%' || term || '%'
  )
  select b.id, b.u_email::text, b.username, b.display_name, b.avatar_url, b.created_at, b.u_last, b.banned_at, b.ban_reason,
    coalesce((select array_agg(r.role::text order by r.role::text) from public.user_roles r where r.user_id = b.id), '{}'::text[]),
    c.id, c.handle,
    (select count(*) from public.videos v where v.owner_id = b.id and v.deleted_at is null),
    coalesce(c.subscriber_count, 0),
    lower(coalesce(b.u_email, '')) = public.owner_email(),
    count(*) over ()
  from base b
  left join public.channels c on c.owner_id = b.id
  order by b.created_at desc
  limit least(greatest(coalesce(lim, 50), 1), 200) offset greatest(coalesce(off, 0), 0);
end;
$$;
grant execute on function public.admin_users(text, integer, integer) to authenticated;

create or replace function public.admin_set_role(target uuid, role public.app_role, enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  target_email text;
begin
  if not public.is_admin() then raise exception 'not_admin' using errcode = 'P0001'; end if;
  if admin_set_role.role not in ('admin', 'moderator') then raise exception 'bad_role' using errcode = 'P0001'; end if;
  select u.email into target_email from auth.users u where u.id = target;
  if target_email is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  if lower(target_email) = public.owner_email() or target = me then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if enabled then
    insert into public.user_roles (user_id, role) values (target, admin_set_role.role) on conflict (user_id, role) do nothing;
  else
    delete from public.user_roles r where r.user_id = target and r.role = admin_set_role.role;
  end if;
  perform public.mod_write_log(me, case when enabled then 'grant_' else 'revoke_' end || admin_set_role.role::text,
    'user', target, coalesce((select p.username from public.profiles p where p.id = target), ''), '');
end;
$$;
grant execute on function public.admin_set_role(uuid, public.app_role, boolean) to authenticated;

create or replace function public.admin_set_ban(target uuid, banned boolean, reason text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  why text := left(btrim(coalesce(reason, '')), 500);
  ch uuid;
  target_email text;
begin
  if not public.is_admin() then raise exception 'not_admin' using errcode = 'P0001'; end if;
  select u.email into target_email from auth.users u where u.id = target;
  if target_email is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  if target = me or lower(target_email) = public.owner_email() or public.has_role(target, 'admin'::public.app_role) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  select c.id into ch from public.channels c where c.owner_id = target;
  if banned then
    if why = '' then raise exception 'reason_required' using errcode = 'P0001'; end if;
    update public.profiles p set banned_at = coalesce(p.banned_at, now()), ban_reason = why where p.id = target;
    if ch is not null then perform public.mod_suspend_channel(ch, why); end if;
  else
    update public.profiles p set banned_at = null, ban_reason = null where p.id = target;
    if ch is not null then perform public.mod_unsuspend_channel(ch); end if;
  end if;
  perform public.mod_write_log(me, case when banned then 'ban' else 'unban' end, 'user', target,
    coalesce((select p.username from public.profiles p where p.id = target), ''), why);
end;
$$;
grant execute on function public.admin_set_ban(uuid, boolean, text) to authenticated;

-- Moderators: community comments
create or replace function public.staff_recent_comments(only_reported boolean default false, lim integer default 100)
returns table (id uuid, body text, created_at timestamptz, removed boolean, author_id uuid, author_name text, author_handle text,
  video_id uuid, video_title text, open_reports bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'not_staff' using errcode = 'P0001'; end if;
  return query
  select cm.id, cm.body, cm.created_at, cm.removed_at is not null, cm.author_id,
    coalesce(nullif(p.display_name, ''), p.username), ch.handle, v.id, v.title,
    (select count(*) from public.reports r where r.target_kind = 'comment' and r.target_id = cm.id and r.status = 'open')
  from public.comments cm
  join public.videos v on v.id = cm.video_id
  left join public.profiles p on p.id = cm.author_id
  left join public.channels ch on ch.owner_id = cm.author_id
  where (cm.deleted_at is null or cm.removed_at is not null)
    and (not only_reported or exists (select 1 from public.reports r where r.target_kind = 'comment' and r.target_id = cm.id and r.status = 'open'))
  order by cm.created_at desc
  limit least(greatest(coalesce(lim, 100), 1), 300);
end;
$$;
grant execute on function public.staff_recent_comments(boolean, integer) to authenticated;

create or replace function public.staff_remove_comment(comment_id uuid, reason text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  com public.comments;
  why text := left(btrim(coalesce(reason, '')), 500);
begin
  if not public.is_staff() then raise exception 'not_staff' using errcode = 'P0001'; end if;
  select * into com from public.comments c where c.id = staff_remove_comment.comment_id for update;
  if com.id is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  if com.removed_at is null then
    update public.comments c
       set removed_at = now(), deleted_at = coalesce(c.deleted_at, now()), body = '', pinned = false, hearted = false
     where c.id = com.id;
  end if;
  update public.reports r set status = 'actioned', resolution = 'remove', resolved_by = me, resolved_at = now()
   where r.status = 'open' and r.target_kind = 'comment' and r.target_id = com.id;
  perform public.mod_write_log(me, 'remove_comment', 'comment', com.id, left(com.body, 200), why);
end;
$$;
grant execute on function public.staff_remove_comment(uuid, text) to authenticated;

-- Automatic NSFW removal (server only): remove the video, ban the uploader for good.
create or replace function public.auto_remove_nsfw(video_id uuid, reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  vid public.videos;
  ch uuid;
  why text := left(coalesce(nullif(btrim(reason), ''), 'Automatic filter: sexual or explicit content'), 500);
begin
  select * into vid from public.videos v where v.id = auto_remove_nsfw.video_id for update;
  if vid.id is null then return false; end if;
  if public.has_role(vid.owner_id, 'admin'::public.app_role) then return false; end if;
  if vid.removed_at is null then
    update public.videos v
       set removed_visibility = coalesce(v.held_visibility, v.visibility), held_visibility = null,
           visibility = 'private', removed_at = now(), removed_reason = why
     where v.id = vid.id;
  end if;
  update public.profiles p set banned_at = coalesce(p.banned_at, now()), ban_reason = why where p.id = vid.owner_id;
  select c.id into ch from public.channels c where c.owner_id = vid.owner_id;
  if ch is not null then perform public.mod_suspend_channel(ch, why); end if;
  perform public.mod_write_log(null, 'remove_video', 'video', vid.id, vid.title, why);
  perform public.mod_write_log(null, 'ban', 'user', vid.owner_id,
    coalesce((select p.username from public.profiles p where p.id = vid.owner_id), ''), why);
  return true;
end;
$$;
revoke execute on function public.auto_remove_nsfw(uuid, text) from public, anon, authenticated;
grant execute on function public.auto_remove_nsfw(uuid, text) to service_role;