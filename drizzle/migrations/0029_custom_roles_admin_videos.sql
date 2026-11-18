CREATE TABLE public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 30),
  color text NOT NULL DEFAULT '#7c3aed' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  show_badge boolean NOT NULL DEFAULT true,
  permissions text[] NOT NULL DEFAULT '{}' CHECK (permissions <@ ARRAY[
    'view_users','ban_users','edit_usernames','manage_videos','manage_comments','manage_reports',
    'manage_bugs','manage_suggestions','manage_words','view_log','read_messages','post_announcements'
  ]::text[]),
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX custom_roles_name_key ON public.custom_roles (lower(btrim(name)));

CREATE TABLE public.user_custom_roles (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);
CREATE INDEX user_custom_roles_role_idx ON public.user_custom_roles (role_id);

GRANT SELECT ON public.custom_roles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_roles TO authenticated;
GRANT ALL ON public.custom_roles TO service_role;
GRANT SELECT ON public.user_custom_roles TO anon;
GRANT SELECT, INSERT, DELETE ON public.user_custom_roles TO authenticated;
GRANT ALL ON public.user_custom_roles TO service_role;

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone sees custom roles" ON public.custom_roles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins create custom roles" ON public.custom_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins edit custom roles" ON public.custom_roles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete custom roles" ON public.custom_roles FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY "Everyone sees who has a custom role" ON public.user_custom_roles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins give custom roles" ON public.user_custom_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins take custom roles away" ON public.user_custom_roles FOR DELETE TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.has_permission(perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  select (select auth.uid()) is not null
    and not exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.banned_at is not null)
    and (
      public.has_role((select auth.uid()), 'admin'::public.app_role)
      or (perm in ('manage_bugs','manage_suggestions','manage_comments')
          and public.has_role((select auth.uid()), 'moderator'::public.app_role))
      or exists (
        select 1 from public.user_custom_roles ur join public.custom_roles cr on cr.id = ur.role_id
        where ur.user_id = (select auth.uid()) and perm = any(cr.permissions)
      )
    );
$$;
REVOKE ALL ON FUNCTION public.has_permission(text) FROM public;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.my_permissions()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  select coalesce(array_agg(x.p order by x.p), '{}'::text[]) from unnest(ARRAY[
    'view_users','ban_users','edit_usernames','manage_videos','manage_comments','manage_reports',
    'manage_bugs','manage_suggestions','manage_words','view_log','read_messages','post_announcements'
  ]::text[]) as x(p) where public.has_permission(x.p);
$$;
REVOKE ALL ON FUNCTION public.my_permissions() FROM public;
GRANT EXECUTE ON FUNCTION public.my_permissions() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  select (public.has_role((select auth.uid()), 'admin'::public.app_role)
          or public.has_role((select auth.uid()), 'moderator'::public.app_role)
          or exists (select 1 from public.user_custom_roles ur join public.custom_roles cr on cr.id = ur.role_id
                     where ur.user_id = (select auth.uid()) and cardinality(cr.permissions) > 0))
     and not exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.banned_at is not null);
$$;

DO $do$
DECLARE
  f record;
  def text;
BEGIN
  FOR f IN
    SELECT p.oid, x.perm, x.gate FROM pg_proc p
    JOIN (VALUES
      ('admin_users', 'view_users', 'public.is_admin()'),
      ('admin_set_ban', 'ban_users', 'public.is_admin()'),
      ('admin_reports', 'manage_reports', 'public.is_admin()'),
      ('admin_words', 'manage_words', 'public.is_admin()'),
      ('admin_set_word', 'manage_words', 'public.is_admin()'),
      ('admin_log', 'view_log', 'public.is_admin()'),
      ('admin_contact_messages', 'read_messages', 'public.is_admin()'),
      ('admin_contact_mark', 'read_messages', 'public.is_admin()'),
      ('staff_recent_comments', 'manage_comments', 'public.is_staff()'),
      ('staff_remove_comment', 'manage_comments', 'public.is_staff()')
    ) AS x(fname, perm, gate) ON x.fname = p.proname
    WHERE p.pronamespace = 'public'::regnamespace
  LOOP
    def := pg_get_functiondef(f.oid);
    IF position(f.gate in def) > 0 THEN
      EXECUTE replace(def, f.gate, format('public.has_permission(%L)', f.perm));
    END IF;
  END LOOP;
END
$do$;

DROP POLICY IF EXISTS "Staff can view every bug report" ON public.bug_reports;
DROP POLICY IF EXISTS "Staff can update bug reports" ON public.bug_reports;
CREATE POLICY "Staff can view every bug report" ON public.bug_reports FOR SELECT TO authenticated
  USING (public.has_permission(CASE WHEN kind = 'idea' THEN 'manage_suggestions' ELSE 'manage_bugs' END));
CREATE POLICY "Staff can update bug reports" ON public.bug_reports FOR UPDATE TO authenticated
  USING (public.has_permission(CASE WHEN kind = 'idea' THEN 'manage_suggestions' ELSE 'manage_bugs' END))
  WITH CHECK (public.has_permission(CASE WHEN kind = 'idea' THEN 'manage_suggestions' ELSE 'manage_bugs' END));

DROP POLICY IF EXISTS "reporter and staff read bug comments" ON public.bug_report_comments;
DROP POLICY IF EXISTS "reporter and staff add bug comments" ON public.bug_report_comments;
CREATE POLICY "reporter and staff read bug comments" ON public.bug_report_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bug_reports b WHERE b.id = bug_report_comments.report_id
    AND (b.reporter_id = auth.uid() OR public.has_permission(CASE WHEN b.kind = 'idea' THEN 'manage_suggestions' ELSE 'manage_bugs' END))));
CREATE POLICY "reporter and staff add bug comments" ON public.bug_report_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.bug_reports b WHERE b.id = bug_report_comments.report_id
    AND (b.reporter_id = auth.uid() OR public.has_permission(CASE WHEN b.kind = 'idea' THEN 'manage_suggestions' ELSE 'manage_bugs' END))));

DROP POLICY IF EXISTS "Everyone reads live announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins post announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins edit announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins delete announcements" ON public.announcements;
CREATE POLICY "Everyone reads live announcements" ON public.announcements FOR SELECT TO anon, authenticated
  USING (active OR public.has_permission('post_announcements'));
CREATE POLICY "Staff post announcements" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('post_announcements') AND created_by = (select auth.uid()));
CREATE POLICY "Staff edit announcements" ON public.announcements FOR UPDATE TO authenticated
  USING (public.has_permission('post_announcements')) WITH CHECK (public.has_permission('post_announcements'));
CREATE POLICY "Staff delete announcements" ON public.announcements FOR DELETE TO authenticated
  USING (public.has_permission('post_announcements'));

CREATE OR REPLACE FUNCTION public.custom_badges()
RETURNS TABLE(username text, channel_handle text, badge_name text, badge_color text, sort_order integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  select p.username, c.handle, cr.name, cr.color, cr.sort_order
  from public.user_custom_roles ur
  join public.custom_roles cr on cr.id = ur.role_id and cr.show_badge
  join public.profiles p on p.id = ur.user_id and p.banned_at is null
  left join public.channels c on c.owner_id = p.id
  order by cr.sort_order, cr.name;
$$;
GRANT EXECUTE ON FUNCTION public.custom_badges() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_rename_user(target uuid, new_username text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  clean text := lower(btrim(coalesce(new_username, '')));
  target_email text;
BEGIN
  IF NOT public.has_permission('edit_usernames') THEN RAISE EXCEPTION 'not_allowed' USING errcode = 'P0001'; END IF;
  SELECT u.email INTO target_email FROM auth.users u WHERE u.id = target;
  IF target_email IS NULL THEN RAISE EXCEPTION 'not_found' USING errcode = 'P0001'; END IF;
  IF (lower(target_email) = public.owner_email() OR public.has_role(target, 'admin'::public.app_role)) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_allowed' USING errcode = 'P0001';
  END IF;
  IF NOT public.username_is_valid(clean) THEN RAISE EXCEPTION 'invalid_username' USING errcode = 'P0001'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE lower(p.username) = clean AND p.id <> target) THEN
    RAISE EXCEPTION 'username_taken' USING errcode = 'P0001';
  END IF;
  UPDATE public.profiles SET username = clean WHERE id = target;
  INSERT INTO public.mod_log (actor_id, action, target_kind, target_id, target_label, reason)
  VALUES (auth.uid(), 'rename_user', 'user', target, clean, 'Username changed by staff');
  RETURN clean;
END $$;
REVOKE ALL ON FUNCTION public.admin_rename_user(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_rename_user(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_search_videos(q text DEFAULT '', lim integer DEFAULT 50)
RETURNS TABLE(id uuid, title text, visibility text, status text, views bigint, created_at timestamptz,
  deleted_at timestamptz, removed_at timestamptz, is_short boolean, channel_name text, channel_handle text, owner_username text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE term text := lower(btrim(coalesce(q, '')));
BEGIN
  IF NOT public.has_permission('manage_videos') THEN RAISE EXCEPTION 'not_allowed' USING errcode = 'P0001'; END IF;
  RETURN QUERY
  SELECT v.id, v.title, v.visibility, v.status, v.views, v.created_at, v.deleted_at, v.removed_at, v.is_short,
    c.name, c.handle, p.username
  FROM public.videos v
  JOIN public.channels c ON c.id = v.channel_id
  LEFT JOIN public.profiles p ON p.id = v.owner_id
  WHERE term = '' OR lower(v.title) LIKE '%' || term || '%' OR lower(c.handle) LIKE '%' || term || '%'
  ORDER BY v.created_at DESC
  LIMIT least(greatest(coalesce(lim, 50), 1), 200);
END $$;
REVOKE ALL ON FUNCTION public.admin_search_videos(text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_search_videos(text, integer) TO authenticated;