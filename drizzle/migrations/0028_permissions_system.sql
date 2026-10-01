CREATE TABLE public.role_permissions (
  role public.app_role NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  PRIMARY KEY (role, resource, action)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_permissions read" ON public.role_permissions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "role_permissions admin insert" ON public.role_permissions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "role_permissions admin update" ON public.role_permissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "role_permissions admin delete" ON public.role_permissions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.user_permission_overrides (
  user_id uuid NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  allowed boolean NOT NULL,
  PRIMARY KEY (user_id, resource, action)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permission_overrides TO authenticated;
GRANT ALL ON public.user_permission_overrides TO service_role;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "overrides read own or admin" ON public.user_permission_overrides FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "overrides admin insert" ON public.user_permission_overrides FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "overrides admin update" ON public.user_permission_overrides FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "overrides admin delete" ON public.user_permission_overrides FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

UPDATE public.user_roles SET role = 'employee' WHERE role = 'user';

CREATE OR REPLACE FUNCTION public.can(_uid uuid, _resource text, _action text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE o boolean;
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;
  IF public.has_role(_uid, 'admin') THEN RETURN true; END IF;
  SELECT allowed INTO o FROM public.user_permission_overrides WHERE user_id = _uid AND resource = _resource AND action = _action;
  IF FOUND THEN RETURN o; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.role_permissions rp JOIN public.user_roles ur ON ur.role = rp.role
    WHERE ur.user_id = _uid AND rp.resource = _resource AND rp.action = _action AND rp.allowed
  );
END $$;

CREATE OR REPLACE FUNCTION public.transfer_resource(_category text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN _category = 'مهنية' THEN 'transfers_pro' ELSE 'transfers' END
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), COALESCE(NEW.email, ''),
          lower(COALESCE(NULLIF(NEW.raw_user_meta_data->>'username',''), split_part(NEW.email, '@', 1))));
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'employee');
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.guard_soft_delete()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _res text;
BEGIN
  IF NEW.is_deleted IS DISTINCT FROM OLD.is_deleted THEN
    _res := CASE TG_TABLE_NAME
      WHEN 'workers' THEN 'workers'
      WHEN 'transfers' THEN public.transfer_resource(NEW.category)
      WHEN 'manual_transfers' THEN 'manual_transfers'
      WHEN 'form_entries' THEN 'custom_forms'
      ELSE TG_TABLE_NAME END;
    IF NOT public.can(auth.uid(), _res, 'delete') THEN
      RAISE EXCEPTION 'غير مسموح: ليس لديك صلاحية الحذف';
    END IF;
  END IF;
  RETURN NEW;
END $function$;

-- workers
DROP POLICY "workers select" ON public.workers;
DROP POLICY "workers insert" ON public.workers;
DROP POLICY "workers update" ON public.workers;
DROP POLICY "workers delete admin" ON public.workers;
CREATE POLICY "workers select" ON public.workers FOR SELECT TO authenticated USING (public.can(auth.uid(),'workers','view') OR public.can(auth.uid(),'transfers','view') OR public.can(auth.uid(),'transfers_pro','view'));
CREATE POLICY "workers insert" ON public.workers FOR INSERT TO authenticated WITH CHECK (public.can(auth.uid(),'workers','add'));
CREATE POLICY "workers update" ON public.workers FOR UPDATE TO authenticated USING (public.can(auth.uid(),'workers','edit') OR public.can(auth.uid(),'workers','delete')) WITH CHECK (public.can(auth.uid(),'workers','edit') OR public.can(auth.uid(),'workers','delete'));
CREATE POLICY "workers delete" ON public.workers FOR DELETE TO authenticated USING (public.can(auth.uid(),'workers','delete'));

-- transfers
DROP POLICY "transfers select" ON public.transfers;
DROP POLICY "transfers insert" ON public.transfers;
DROP POLICY "transfers update" ON public.transfers;
DROP POLICY "transfers delete admin" ON public.transfers;
CREATE POLICY "transfers select" ON public.transfers FOR SELECT TO authenticated USING (public.can(auth.uid(), public.transfer_resource(category), 'view') OR public.can(auth.uid(),'workers','view'));
CREATE POLICY "transfers insert" ON public.transfers FOR INSERT TO authenticated WITH CHECK (public.can(auth.uid(), public.transfer_resource(category), 'add') OR public.can(auth.uid(),'workers','edit'));
CREATE POLICY "transfers update" ON public.transfers FOR UPDATE TO authenticated USING (public.can(auth.uid(), public.transfer_resource(category), 'edit') OR public.can(auth.uid(), public.transfer_resource(category), 'delete')) WITH CHECK (public.can(auth.uid(), public.transfer_resource(category), 'edit') OR public.can(auth.uid(), public.transfer_resource(category), 'delete'));
CREATE POLICY "transfers delete" ON public.transfers FOR DELETE TO authenticated USING (public.can(auth.uid(), public.transfer_resource(category), 'delete'));

-- simple tables
DO $$
DECLARE t text; r text;
BEGIN
  FOR t, r IN SELECT * FROM (VALUES ('manual_transfers','manual_transfers'),('requests','requests'),('flights','flights'),('office_visas','visas'),('form_entries','custom_forms')) v(t, r) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || ' select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || ' insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || ' update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || ' delete admin', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.can(auth.uid(), %L, ''view''))', t || ' select', t, r);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can(auth.uid(), %L, ''add''))', t || ' insert', t, r);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.can(auth.uid(), %L, ''edit'') OR public.can(auth.uid(), %L, ''delete'')) WITH CHECK (public.can(auth.uid(), %L, ''edit'') OR public.can(auth.uid(), %L, ''delete''))', t || ' update', t, r, r, r, r);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.can(auth.uid(), %L, ''delete''))', t || ' delete', t, r);
  END LOOP;
END $$;