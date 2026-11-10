create or replace function public.comments_flag_on(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.feature_flags f
    where f.key = 'comments'
      and (f.mode = 'everyone' or (f.mode = 'test' and uid = any (f.users)))
  );
$$;

create or replace function public.comment_clean_body(body text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(
    regexp_replace(replace(coalesce(body, ''), E'\r\n', E'\n'), E'\n{3,}', E'\n\n', 'g'),
    E' \t\n\r'
  );
$$;

alter table public.videos add column if not exists comment_count bigint not null default 0;
alter table public.videos drop constraint if exists videos_comment_count_positive;
alter table public.videos add constraint videos_comment_count_positive check (comment_count >= 0);

alter table public.videos add column if not exists comments_mode text;
alter table public.videos drop constraint if exists videos_comments_mode_valid;
alter table public.videos add constraint videos_comments_mode_valid
  check (comments_mode is null or comments_mode in ('on', 'off', 'held'));

alter table public.channels add column if not exists comments_default text not null default 'on';
alter table public.channels drop constraint if exists channels_comments_default_valid;
alter table public.channels add constraint channels_comments_default_valid
  check (comments_default in ('on', 'off', 'held'));

grant select (comments_default) on public.channels to anon, authenticated;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null,
  like_count bigint not null default 0,
  reply_count int not null default 0,
  pinned boolean not null default false,
  hearted boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint comments_body_length check (
    char_length(body) <= 2000 and (deleted_at is not null or char_length(body) >= 1)
  ),
  constraint comments_counts_positive check (like_count >= 0 and reply_count >= 0),
  constraint comments_pin_top_level check (not pinned or parent_id is null)
);

create index if not exists comments_video_new_idx
  on public.comments (video_id, created_at desc, id desc) where parent_id is null;
create index if not exists comments_video_top_idx
  on public.comments (video_id, like_count desc, created_at desc, id desc) where parent_id is null;
create index if not exists comments_replies_idx on public.comments (parent_id, created_at, id) where parent_id is not null;
create index if not exists comments_author_idx on public.comments (author_id, created_at desc);
create unique index if not exists comments_one_pinned_key on public.comments (video_id) where pinned;

alter table public.comments enable row level security;

drop policy if exists "comments on watchable videos are readable by everyone" on public.comments;
create policy "comments on watchable videos are readable by everyone"
  on public.comments
  for select
  to anon, authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.videos v
      where v.id = comments.video_id and v.status = 'ready' and v.visibility in ('public', 'unlisted')
    )
  );

revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant all on public.comments to service_role;

create table if not exists public.comment_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  comment_id uuid not null references public.comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);

create index if not exists comment_likes_comment_idx on public.comment_likes (comment_id);

alter table public.comment_likes enable row level security;

drop policy if exists "people read their own comment likes" on public.comment_likes;
create policy "people read their own comment likes"
  on public.comment_likes
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.comment_likes from anon, authenticated;
grant select on public.comment_likes to authenticated;
grant all on public.comment_likes to service_role;

create table if not exists public.comment_requests (
  user_id uuid not null references public.profiles (id) on delete cascade,
  bucket text not null,
  at timestamptz not null default now()
);

create index if not exists comment_requests_recent_idx on public.comment_requests (user_id, bucket, at desc);

alter table public.comment_requests enable row level security;
revoke all on public.comment_requests from anon, authenticated;
grant all on public.comment_requests to service_role;

create or replace function public.comments_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  was int := case when tg_op <> 'INSERT' and old.deleted_at is null then 1 else 0 end;
  now_alive int := case when tg_op <> 'DELETE' and new.deleted_at is null then 1 else 0 end;
  vid uuid := case when tg_op = 'DELETE' then old.video_id else new.video_id end;
  parent uuid := case when tg_op = 'DELETE' then old.parent_id else new.parent_id end;
begin
  if now_alive = was then
    return null;
  end if;
  update public.videos v set comment_count = greatest(v.comment_count + now_alive - was, 0) where v.id = vid;
  if parent is not null then
    update public.comments c set reply_count = greatest(c.reply_count + now_alive - was, 0) where c.id = parent;
  end if;
  return null;
end;
$$;

drop trigger if exists comments_count on public.comments;
create trigger comments_count
  after insert or update of deleted_at or delete on public.comments
  for each row execute function public.comments_count();

create or replace function public.comment_likes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.comments c set like_count = c.like_count + 1 where c.id = new.comment_id;
  else
    update public.comments c set like_count = greatest(c.like_count - 1, 0) where c.id = old.comment_id;
  end if;
  return null;
end;
$$;

drop trigger if exists comment_likes_count on public.comment_likes;
create trigger comment_likes_count
  after insert or delete on public.comment_likes
  for each row execute function public.comment_likes_count();

update public.comments c
   set like_count = coalesce((select count(*) from public.comment_likes l where l.comment_id = c.id), 0)
 where c.like_count is distinct from coalesce((select count(*) from public.comment_likes l where l.comment_id = c.id), 0);

update public.comments c
   set reply_count = coalesce((select count(*) from public.comments r where r.parent_id = c.id and r.deleted_at is null), 0)
 where c.reply_count is distinct from coalesce((
     select count(*) from public.comments r where r.parent_id = c.id and r.deleted_at is null
   ), 0);

update public.videos v
   set comment_count = coalesce((select count(*) from public.comments c where c.video_id = v.id and c.deleted_at is null), 0)
 where v.comment_count is distinct from coalesce((
     select count(*) from public.comments c where c.video_id = v.id and c.deleted_at is null
   ), 0);

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
  ) as liked
from public.comments c
join public.videos v on v.id = c.video_id
join public.profiles p on p.id = c.author_id
left join public.channels ch on ch.owner_id = c.author_id;

revoke all on public.comment_cards from public, anon, authenticated;

create or replace function public.video_comments_mode(video_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(v.comments_mode, c.comments_default, 'on')
  from public.videos v
  left join public.channels c on c.id = v.channel_id
  where v.id = video_comments_mode.video_id;
$$;

create or replace function public.comments_video_visible(video_id uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.videos v
    where v.id = comments_video_visible.video_id
      and v.status = 'ready'
      and (v.visibility in ('public', 'unlisted') or v.owner_id = uid)
  );
$$;

create or replace function public.comment_throttle(who uuid, bucket text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  last_minute int;
  last_day int;
  young boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended('comments:' || bucket || ':' || who::text, 0));
  delete from public.comment_requests r
   where r.user_id = who and r.bucket = comment_throttle.bucket and r.at < now() - interval '1 day';
  if random() < 0.01 then
    delete from public.comment_requests r where r.at < now() - interval '1 day';
  end if;

  select
    count(*) filter (where r.at >= now() - interval '1 minute'),
    count(*)
  into last_minute, last_day
  from public.comment_requests r
  where r.user_id = who and r.bucket = comment_throttle.bucket;

  if bucket = 'post' then
    select p.created_at > now() - interval '1 day' into young from public.profiles p where p.id = who;
    if coalesce(young, false) and last_minute >= 3 then
      raise exception 'rate_limited_new' using errcode = 'P0001';
    end if;
    if last_minute >= 10 then
      raise exception 'rate_limited_minute' using errcode = 'P0001';
    end if;
    if last_day >= 100 then
      raise exception 'rate_limited_day' using errcode = 'P0001';
    end if;
  elsif last_minute >= 60 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.comment_requests (user_id, bucket) values (who, comment_throttle.bucket);
end;
$$;

create or replace function public.comments_writer()
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
  if not public.comments_flag_on(me) then
    raise exception 'comments_off' using errcode = 'P0001';
  end if;
  return me;
end;
$$;

drop function if exists public.comments_info(uuid);
drop function if exists public.list_comments(uuid, text, jsonb, int);
drop function if exists public.list_replies(uuid, jsonb, int);
drop function if exists public.comments_since(uuid, jsonb, int);
drop function if exists public.post_comment(uuid, text, uuid);
drop function if exists public.edit_comment(uuid, text);
drop function if exists public.delete_comment(uuid);
drop function if exists public.like_comment(uuid, boolean);
drop function if exists public.pin_comment(uuid, boolean);
drop function if exists public.heart_comment(uuid, boolean);
drop function if exists public.set_comments_mode(uuid, text);
drop function if exists public.set_channel_comments_default(text);
drop function if exists public.studio_comments(int);

create function public.comments_info(video_id uuid)
returns table (comment_count bigint, mode text, is_owner boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    v.comment_count,
    public.video_comments_mode(v.id),
    coalesce(v.owner_id = (select auth.uid()), false)
  from public.videos v
  where v.id = comments_info.video_id
    and public.comments_flag_on((select auth.uid()))
    and public.comments_video_visible(v.id, (select auth.uid()));
$$;

create function public.list_comments(
  video_id uuid,
  sort text default 'top',
  cursor jsonb default null,
  lim int default 20
)
returns setof public.comment_cards
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  n int := least(greatest(coalesce(lim, 20), 1), 50);
  c_likes bigint := (list_comments.cursor ->> 'likes')::bigint;
  c_at timestamptz := (list_comments.cursor ->> 'at')::timestamptz;
  c_id uuid := (list_comments.cursor ->> 'id')::uuid;
begin
  if list_comments.sort is null or list_comments.sort not in ('top', 'newest') then
    raise exception 'bad_sort' using errcode = 'P0001';
  end if;
  if not public.comments_flag_on(me)
     or not public.comments_video_visible(list_comments.video_id, me)
     or public.video_comments_mode(list_comments.video_id) = 'off' then
    return;
  end if;

  if list_comments.cursor is null then
    return query
    select k.* from public.comment_cards k
    where k.video_id = list_comments.video_id and k.parent_id is null and k.pinned and not k.deleted;
  end if;

  if list_comments.sort = 'newest' then
    return query
    select k.* from public.comment_cards k
    where k.video_id = list_comments.video_id
      and k.parent_id is null
      and not k.pinned
      and (not k.deleted or k.reply_count > 0)
      and (c_at is null or (k.created_at, k.id) < (c_at, coalesce(c_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
    order by k.created_at desc, k.id desc
    limit n;
  else
    return query
    select k.* from public.comment_cards k
    where k.video_id = list_comments.video_id
      and k.parent_id is null
      and not k.pinned
      and (not k.deleted or k.reply_count > 0)
      and (
        c_at is null
        or (k.like_count, k.created_at, k.id)
           < (coalesce(c_likes, 0), c_at, coalesce(c_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
      )
    order by k.like_count desc, k.created_at desc, k.id desc
    limit n;
  end if;
end;
$$;
