create function public.list_replies(parent_id uuid, cursor jsonb default null, lim int default 10)
returns setof public.comment_cards
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  n int := least(greatest(coalesce(lim, 10), 1), 50);
  c_at timestamptz := (list_replies.cursor ->> 'at')::timestamptz;
  c_id uuid := (list_replies.cursor ->> 'id')::uuid;
  vid uuid;
begin
  select c.video_id into vid from public.comments c where c.id = list_replies.parent_id and c.parent_id is null;
  if vid is null
     or not public.comments_flag_on(me)
     or not public.comments_video_visible(vid, me)
     or public.video_comments_mode(vid) = 'off' then
    return;
  end if;
  return query
  select k.* from public.comment_cards k
  where k.parent_id = list_replies.parent_id
    and not k.deleted
    and (c_at is null or (k.created_at, k.id) > (c_at, coalesce(c_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  order by k.created_at, k.id
  limit n;
end;
$$;

create function public.comments_since(video_id uuid, cursor jsonb, lim int default 50)
returns setof public.comment_cards
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  n int := least(greatest(coalesce(lim, 50), 1), 100);
  c_at timestamptz := (comments_since.cursor ->> 'at')::timestamptz;
  c_id uuid := (comments_since.cursor ->> 'id')::uuid;
begin
  if not public.comments_flag_on(me)
     or not public.comments_video_visible(comments_since.video_id, me)
     or public.video_comments_mode(comments_since.video_id) = 'off' then
    return;
  end if;
  return query
  select k.* from public.comment_cards k
  where k.video_id = comments_since.video_id
    and k.parent_id is null
    and not k.deleted
    and (c_at is null or (k.created_at, k.id) > (c_at, coalesce(c_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  order by k.created_at desc, k.id desc
  limit n;
end;
$$;

create function public.post_comment(video_id uuid, body text, parent_id uuid default null)
returns setof public.comment_cards
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.comments_writer();
  v public.videos;
  mode text;
  text_in text := public.comment_clean_body(post_comment.body);
  parent public.comments;
  top uuid;
  new_id uuid;
begin
  if not coalesce((select p.onboarded from public.profiles p where p.id = me), false) then
    raise exception 'not_onboarded' using errcode = 'P0001';
  end if;
  select * into v from public.videos x where x.id = post_comment.video_id;
  if not found or not public.comments_video_visible(v.id, me) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  mode := public.video_comments_mode(v.id);
  if mode = 'off' then
    raise exception 'comments_disabled' using errcode = 'P0001';
  end if;
  if mode = 'held' and v.owner_id <> me then
    raise exception 'comments_held' using errcode = 'P0001';
  end if;
  if char_length(text_in) = 0 then
    raise exception 'bad_body' using errcode = 'P0001';
  end if;
  if char_length(text_in) > 2000 then
    raise exception 'body_too_long' using errcode = 'P0001';
  end if;
  if post_comment.parent_id is not null then
    select * into parent from public.comments c where c.id = post_comment.parent_id;
    if not found or parent.video_id <> v.id then
      raise exception 'bad_parent' using errcode = 'P0001';
    end if;
    top := coalesce(parent.parent_id, parent.id);
    if exists (select 1 from public.comments c where c.id = top and c.deleted_at is not null and c.reply_count = 0) then
      raise exception 'bad_parent' using errcode = 'P0001';
    end if;
  end if;
  perform public.comment_throttle(me, 'post');

  insert into public.comments (video_id, author_id, parent_id, body)
  values (v.id, me, top, text_in)
  returning id into new_id;

  return query select k.* from public.comment_cards k where k.id = new_id;
end;
$$;

create function public.edit_comment(comment_id uuid, body text)
returns setof public.comment_cards
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.comments_writer();
  c public.comments;
  text_in text := public.comment_clean_body(edit_comment.body);
begin
  select * into c from public.comments x where x.id = edit_comment.comment_id;
  if not found or c.deleted_at is not null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if c.author_id <> me then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if char_length(text_in) = 0 then
    raise exception 'bad_body' using errcode = 'P0001';
  end if;
  if char_length(text_in) > 2000 then
    raise exception 'body_too_long' using errcode = 'P0001';
  end if;
  perform public.comment_throttle(me, 'act');
  update public.comments x
     set body = text_in, edited_at = case when x.body = text_in then x.edited_at else now() end
   where x.id = c.id;
  return query select k.* from public.comment_cards k where k.id = c.id;
end;
$$;

create function public.delete_comment(comment_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.comments_writer();
  c public.comments;
  owner uuid;
begin
  select * into c from public.comments x where x.id = delete_comment.comment_id;
  if not found or c.deleted_at is not null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  select v.owner_id into owner from public.videos v where v.id = c.video_id;
  if c.author_id <> me and owner is distinct from me then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  perform public.comment_throttle(me, 'act');
  update public.comments x
     set deleted_at = now(), body = '', pinned = false, hearted = false
   where x.id = c.id;
  return true;
end;
$$;

create function public.like_comment(comment_id uuid, "on" boolean default null)
returns table (liked boolean, like_count bigint)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.comments_writer();
  c public.comments;
  want boolean;
begin
  select * into c from public.comments x where x.id = like_comment.comment_id;
  if not found or c.deleted_at is not null or not public.comments_video_visible(c.video_id, me) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  perform public.comment_throttle(me, 'act');
  want := coalesce(
    like_comment."on",
    not exists (select 1 from public.comment_likes l where l.user_id = me and l.comment_id = c.id)
  );
  if want then
    insert into public.comment_likes (user_id, comment_id) values (me, c.id)
    on conflict on constraint comment_likes_pkey do nothing;
  else
    delete from public.comment_likes l where l.user_id = me and l.comment_id = c.id;
  end if;
  return query
  select exists (select 1 from public.comment_likes l where l.user_id = me and l.comment_id = c.id), x.like_count
  from public.comments x where x.id = c.id;
end;
$$;

create or replace function public.comment_for_owner(comment_id uuid, me uuid)
returns public.comments
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.comments;
begin
  select * into c from public.comments x where x.id = comment_for_owner.comment_id;
  if not found or c.deleted_at is not null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.videos v where v.id = c.video_id and v.owner_id = me) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  return c;
end;
$$;

create function public.pin_comment(comment_id uuid, "on" boolean default true)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.comments_writer();
  c public.comments := public.comment_for_owner(pin_comment.comment_id, me);
begin
  if c.parent_id is not null then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  perform public.comment_throttle(me, 'act');
  if coalesce(pin_comment."on", true) then
    update public.comments x set pinned = false where x.video_id = c.video_id and x.pinned and x.id <> c.id;
    update public.comments x set pinned = true where x.id = c.id;
  else
    update public.comments x set pinned = false where x.id = c.id;
  end if;
  return coalesce(pin_comment."on", true);
end;
$$;

create function public.heart_comment(comment_id uuid, "on" boolean default true)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.comments_writer();
  c public.comments := public.comment_for_owner(heart_comment.comment_id, me);
begin
  perform public.comment_throttle(me, 'act');
  update public.comments x set hearted = coalesce(heart_comment."on", true) where x.id = c.id;
  return coalesce(heart_comment."on", true);
end;
$$;

create function public.set_comments_mode(video_id uuid, mode text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.comments_writer();
begin
  if mode is not null and mode not in ('on', 'off', 'held') then
    raise exception 'bad_mode' using errcode = 'P0001';
  end if;
  update public.videos v set comments_mode = set_comments_mode.mode
   where v.id = set_comments_mode.video_id and v.owner_id = me;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  return public.video_comments_mode(set_comments_mode.video_id);
end;
$$;

create function public.set_channel_comments_default(mode text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.comments_writer();
begin
  if mode is null or mode not in ('on', 'off', 'held') then
    raise exception 'bad_mode' using errcode = 'P0001';
  end if;
  update public.channels c set comments_default = set_channel_comments_default.mode where c.owner_id = me;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  return mode;
end;
$$;

create function public.studio_comments(lim int default 50)
returns table (
  id uuid,
  video_id uuid,
  video_title text,
  parent_id uuid,
  body text,
  like_count bigint,
  reply_count int,
  pinned boolean,
  hearted boolean,
  created_at timestamptz,
  edited_at timestamptz,
  author_handle text,
  author_name text,
  author_avatar_url text,
  by_owner boolean,
  channel_default text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    k.id, k.video_id, v.title, k.parent_id, k.body, k.like_count, k.reply_count, k.pinned, k.hearted,
    k.created_at, k.edited_at, k.author_handle, k.author_name, k.author_avatar_url, k.by_owner,
    coalesce((select ch.comments_default from public.channels ch where ch.owner_id = (select auth.uid())), 'on')
  from public.comment_cards k
  join public.videos v on v.id = k.video_id
  where v.owner_id = (select auth.uid())
    and not k.deleted
    and public.comments_flag_on((select auth.uid()))
  order by k.created_at desc, k.id desc
  limit least(greatest(coalesce(studio_comments.lim, 50), 1), 50);
$$;

revoke execute on function public.comments_flag_on(uuid) from public, anon, authenticated;
revoke execute on function public.comments_count() from public, anon, authenticated;
revoke execute on function public.comment_likes_count() from public, anon, authenticated;
revoke execute on function public.video_comments_mode(uuid) from public, anon, authenticated;
revoke execute on function public.comments_video_visible(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.comment_throttle(uuid, text) from public, anon, authenticated;
revoke execute on function public.comments_writer() from public, anon, authenticated;
revoke execute on function public.comment_for_owner(uuid, uuid) from public, anon, authenticated;

revoke execute on function public.comments_info(uuid) from public;
revoke execute on function public.list_comments(uuid, text, jsonb, int) from public;
revoke execute on function public.list_replies(uuid, jsonb, int) from public;
revoke execute on function public.comments_since(uuid, jsonb, int) from public;
revoke execute on function public.post_comment(uuid, text, uuid) from public;
revoke execute on function public.edit_comment(uuid, text) from public;
revoke execute on function public.delete_comment(uuid) from public;
revoke execute on function public.like_comment(uuid, boolean) from public;
revoke execute on function public.pin_comment(uuid, boolean) from public;
revoke execute on function public.heart_comment(uuid, boolean) from public;
revoke execute on function public.set_comments_mode(uuid, text) from public;
revoke execute on function public.set_channel_comments_default(text) from public;
revoke execute on function public.studio_comments(int) from public;

grant execute on function public.comments_info(uuid) to anon, authenticated;
grant execute on function public.list_comments(uuid, text, jsonb, int) to anon, authenticated;
grant execute on function public.list_replies(uuid, jsonb, int) to anon, authenticated;
grant execute on function public.comments_since(uuid, jsonb, int) to anon, authenticated;
grant execute on function public.post_comment(uuid, text, uuid) to authenticated;
grant execute on function public.edit_comment(uuid, text) to authenticated;
grant execute on function public.delete_comment(uuid) to authenticated;
grant execute on function public.like_comment(uuid, boolean) to authenticated;
grant execute on function public.pin_comment(uuid, boolean) to authenticated;
grant execute on function public.heart_comment(uuid, boolean) to authenticated;
grant execute on function public.set_comments_mode(uuid, text) to authenticated;
grant execute on function public.set_channel_comments_default(text) to authenticated;
grant execute on function public.studio_comments(int) to authenticated;

insert into public.feature_flags (key, label, description, mode)
values (
  'comments',
  'Comments',
  'The comments section under the watch page: posting, replies, likes, the creator''s pin and heart, and /studio/comments.',
  'off'
)
on conflict (key) do nothing;
