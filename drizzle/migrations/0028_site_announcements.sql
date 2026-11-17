CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 2000),
  kind text NOT NULL DEFAULT 'update' CHECK (kind IN ('update','feature','fix','maintenance')),
  link text CHECK (link IS NULL OR link ~ '^(https://|/)'),
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX announcements_active_created_idx ON public.announcements (active, created_at DESC);

GRANT SELECT ON public.announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone reads live announcements" ON public.announcements
  FOR SELECT TO anon, authenticated USING (active OR public.is_admin());
CREATE POLICY "Admins post announcements" ON public.announcements
  FOR INSERT TO authenticated WITH CHECK (public.is_admin() AND created_by = (select auth.uid()));
CREATE POLICY "Admins edit announcements" ON public.announcements
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete announcements" ON public.announcements
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.announcements_touch() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER announcements_touch BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.announcements_touch();