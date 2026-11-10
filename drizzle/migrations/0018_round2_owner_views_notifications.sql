-- Owner account: the verified owner email always gets the admin role.
create or replace function public.owner_email()
returns text language sql immutable set search_path = '' as $$ select 'romendraroy4@gmail.com'::text $$;

create or replace function public.grant_owner_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is not null and lower(coalesce(new.email, '')) = public.owner_email() then
    insert into public.user_roles (user_id, role) values (new.id, 'admin'::public.app_role)
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_grant_owner on auth.users;
create trigger on_auth_user_created_grant_owner
after insert on auth.users
for each row execute function public.grant_owner_admin();

drop trigger if exists on_auth_user_confirmed_grant_owner on auth.users;
create trigger on_auth_user_confirmed_grant_owner
after update of email_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.grant_owner_admin();

insert into public.user_roles (user_id, role)
select u.id, 'admin'::public.app_role from auth.users u
where lower(coalesce(u.email, '')) = public.owner_email() and u.email_confirmed_at is not null
on conflict (user_id, role) do nothing;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select (public.has_role((select auth.uid()), 'admin'::public.app_role)
          or public.has_role((select auth.uid()), 'moderator'::public.app_role))
     and not exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.banned_at is not null);
$$;

-- Public staff badges: blue for the owner and admins, green for moderators.
create or replace function public.staff_badges()
returns table (user_id uuid, username text, channel_handle text, badge text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, c.handle,
    case
      when lower(coalesce(u.email, '')) = public.owner_email() then 'owner'
      when bool_or(r.role = 'admin') then 'admin'
      else 'moderator'
    end
  from public.user_roles r
  join public.profiles p on p.id = r.user_id
  join auth.users u on u.id = r.user_id
  left join public.channels c on c.owner_id = p.id
  where r.role in ('admin', 'moderator') and p.banned_at is null
  group by p.id, p.username, c.handle, u.email;
$$;
grant execute on function public.staff_badges() to anon, authenticated;

-- Views: each viewer counts once per video, ever. Earlier counts stay as they are.
create index if not exists view_events_counted_idx on public.view_events (video_id, viewer_key) where counted;

CREATE OR REPLACE FUNCTION public.watch_ping(video_id uuid, position_s numeric, played_s numeric, source text DEFAULT NULL::text)
 RETURNS TABLE(counted boolean, views bigint, watched_s integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  src text := case when public.stats_source_is_valid(watch_ping.source) then watch_ping.source end;
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

  insert into public.view_events as e (video_id, viewer_key, day, source)
  values (v.id, who, today, src)
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
  if not ev.counted
     and ev.watched_s >= public.view_threshold_s(v.duration_s, v.is_short)
     and not exists (
       select 1 from public.view_events p
        where p.video_id = v.id and p.viewer_key = who and p.counted and p.day <> today
     ) then
    ev.counted := true;
    counted_now := true;
  end if;
  ev.reached := public.stats_reached(
    ev.reached,
    pos - least(greatest(coalesce(watch_ping.played_s, 0), 0), 60),
    pos,
    v.duration_s
  );

  update public.view_events e
     set watched_s = ev.watched_s,
         counted = ev.counted,
         counted_at = case when counted_now then now() else e.counted_at end,
         reached = ev.reached,
         source = coalesce(e.source, src),
         last_at = now()
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
$function$;

-- Notifications for new comments and replies, and bug report updates.
alter table public.notifications add column if not exists comment_id uuid references public.comments(id) on delete cascade;
alter table public.notifications add column if not exists bug_report_id uuid references public.bug_reports(id) on delete cascade;
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array['comment', 'reply', 'like', 'subscribe', 'bug']));
create index if not exists notifications_user_recent_idx on public.notifications (user_id, created_at desc);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;

create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v public.videos;
  parent public.comments;
  who text;
  snippet text := left(regexp_replace(coalesce(new.body, ''), '\s+', ' ', 'g'), 120);
begin
  select * into v from public.videos x where x.id = new.video_id;
  if v.id is null then return new; end if;
  select coalesce(nullif(p.display_name, ''), p.username) into who from public.profiles p where p.id = new.author_id;
  who := coalesce(who, 'Someone');
  if new.parent_id is null then
    if v.owner_id <> new.author_id then
      insert into public.notifications (user_id, type, message, video_id, actor_id, comment_id)
      values (v.owner_id, 'comment', left(who || ' commented on "' || v.title || '": ' || snippet, 500), v.id, new.author_id, new.id);
    end if;
  else
    select * into parent from public.comments c where c.id = new.parent_id;
    if parent.id is not null and parent.author_id <> new.author_id then
      insert into public.notifications (user_id, type, message, video_id, actor_id, comment_id)
      values (parent.author_id, 'reply', left(who || ' replied to your comment: ' || snippet, 500), v.id, new.author_id, new.id);
    end if;
    if v.owner_id <> new.author_id and (parent.id is null or parent.author_id <> v.owner_id) then
      insert into public.notifications (user_id, type, message, video_id, actor_id, comment_id)
      values (v.owner_id, 'reply', left(who || ' replied on "' || v.title || '": ' || snippet, 500), v.id, new.author_id, new.id);
    end if;
  end if;
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists comments_notify on public.comments;
create trigger comments_notify after insert on public.comments
for each row execute function public.notify_on_comment();

create or replace function public.my_notifications(lim integer default 30)
returns table (id uuid, type text, message text, video_id uuid, comment_id uuid, bug_report_id uuid, read boolean, created_at timestamptz,
  actor_name text, actor_avatar_url text)
language sql stable security definer set search_path = '' as $$
  select n.id, n.type, n.message, n.video_id, n.comment_id, n.bug_report_id, n.read, n.created_at,
    coalesce(nullif(a.display_name, ''), a.username), a.avatar_url
  from public.notifications n
  left join public.profiles a on a.id = n.actor_id
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit least(greatest(coalesce(lim, 30), 1), 100);
$$;
grant execute on function public.my_notifications(integer) to authenticated;

create or replace function public.mark_notifications_read(ids uuid[] default null)
returns void language sql security definer set search_path = '' as $$
  update public.notifications n set read = true
   where n.user_id = auth.uid() and not n.read and (ids is null or n.id = any (ids));
$$;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;