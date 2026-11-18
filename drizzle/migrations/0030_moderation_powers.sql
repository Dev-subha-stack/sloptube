CREATE OR REPLACE FUNCTION public.moderation_staff(perm text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me uuid := public.moderation_caller();
BEGIN
  IF NOT public.has_permission(perm) THEN RAISE EXCEPTION 'not_admin' USING errcode = 'P0001'; END IF;
  RETURN me;
END $$;
REVOKE ALL ON FUNCTION public.moderation_staff(text) FROM public;
GRANT EXECUTE ON FUNCTION public.moderation_staff(text) TO authenticated;

DO $do$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid, x.perm FROM pg_proc p
    JOIN (VALUES
      ('mod_action', 'manage_reports'),
      ('admin_suspended', 'manage_reports'),
      ('admin_reports', 'manage_reports'),
      ('admin_log', 'view_log'),
      ('admin_words', 'manage_words'),
      ('admin_set_word', 'manage_words')
    ) AS x(fname, perm) ON x.fname = p.proname
    WHERE p.pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE replace(pg_get_functiondef(f.oid), 'public.moderation_admin()', format('public.moderation_staff(%L)', f.perm));
  END LOOP;
END
$do$;

-- Staff with the power read reports, strikes, the log and the word list directly too.
DROP POLICY IF EXISTS "admins read every report" ON public.reports;
CREATE POLICY "admins read every report" ON public.reports FOR SELECT TO authenticated USING ((SELECT public.has_permission('manage_reports')));
DROP POLICY IF EXISTS "admins read every strike" ON public.channel_strikes;
CREATE POLICY "admins read every strike" ON public.channel_strikes FOR SELECT TO authenticated USING ((SELECT public.has_permission('manage_reports')));
DROP POLICY IF EXISTS "admins read the mod log" ON public.mod_log;
CREATE POLICY "admins read the mod log" ON public.mod_log FOR SELECT TO authenticated USING ((SELECT public.has_permission('view_log')));
DROP POLICY IF EXISTS "admins read the word list" ON public.moderation_words;
CREATE POLICY "admins read the word list" ON public.moderation_words FOR SELECT TO authenticated USING ((SELECT public.has_permission('manage_words')));