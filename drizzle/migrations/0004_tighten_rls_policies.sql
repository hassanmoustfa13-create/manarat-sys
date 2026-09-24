CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.staff_names()
RETURNS TABLE(id uuid, full_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name FROM public.profiles p WHERE public.is_staff(auth.uid())
$$;
REVOKE ALL ON FUNCTION public.staff_names() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_names() TO authenticated;

DROP POLICY IF EXISTS "profiles readable by signed in" ON public.profiles;
CREATE POLICY "profiles read own or admin" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "roles readable by signed in" ON public.user_roles;
CREATE POLICY "roles read own or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "workers select" ON public.workers;
DROP POLICY IF EXISTS "workers insert" ON public.workers;
DROP POLICY IF EXISTS "workers update" ON public.workers;
CREATE POLICY "workers select" ON public.workers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "workers insert" ON public.workers FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "workers update" ON public.workers FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "transfers select" ON public.transfers;
DROP POLICY IF EXISTS "transfers insert" ON public.transfers;
DROP POLICY IF EXISTS "transfers update" ON public.transfers;
CREATE POLICY "transfers select" ON public.transfers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "transfers insert" ON public.transfers FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "transfers update" ON public.transfers FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "requests select" ON public.requests;
DROP POLICY IF EXISTS "requests insert" ON public.requests;
DROP POLICY IF EXISTS "requests update" ON public.requests;
CREATE POLICY "requests select" ON public.requests FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "requests insert" ON public.requests FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "requests update" ON public.requests FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));