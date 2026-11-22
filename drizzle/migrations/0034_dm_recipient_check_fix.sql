CREATE OR REPLACE FUNCTION public.dm_can_receive(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  select exists (select 1 from public.profiles p where p.id = _user and p.onboarded and p.banned_at is null);
$$;
REVOKE ALL ON FUNCTION public.dm_can_receive(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dm_can_receive(uuid) TO authenticated;

DROP POLICY IF EXISTS "People send as themselves to active accounts" ON public.direct_messages;
CREATE POLICY "People send as themselves to active accounts" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = (select auth.uid()) AND read_at IS NULL AND sender_id <> recipient_id AND public.dm_can_receive(recipient_id));