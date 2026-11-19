DROP POLICY IF EXISTS "Everyone sees custom roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Everyone sees who has a custom role" ON public.user_custom_roles;
REVOKE SELECT ON public.custom_roles FROM anon;
REVOKE SELECT ON public.user_custom_roles FROM anon;
CREATE POLICY "Admins and holders see custom roles" ON public.custom_roles FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.user_custom_roles u WHERE u.role_id = custom_roles.id AND u.user_id = auth.uid()));
CREATE POLICY "Admins and holders see role assignments" ON public.user_custom_roles FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());