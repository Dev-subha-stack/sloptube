DROP POLICY IF EXISTS "profiles are readable by everyone" ON public.profiles;
CREATE POLICY "finished profiles are public; own and staff see all"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    onboarded
    OR (SELECT auth.uid()) = id
    OR public.is_staff()
  );