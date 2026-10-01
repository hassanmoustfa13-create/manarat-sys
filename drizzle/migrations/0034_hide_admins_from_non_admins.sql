DROP POLICY IF EXISTS "profiles read with users view" ON public.profiles;
DROP POLICY IF EXISTS "roles read with users view" ON public.user_roles;
CREATE POLICY "profiles read with users view" ON public.profiles FOR SELECT TO authenticated
  USING (public.can(auth.uid(), 'admin_users', 'view') AND NOT public.has_role(id, 'admin'));
CREATE POLICY "roles read with users view" ON public.user_roles FOR SELECT TO authenticated
  USING (public.can(auth.uid(), 'admin_users', 'view') AND NOT public.has_role(user_id, 'admin'));