CREATE OR REPLACE FUNCTION public.manual_resource(_category text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $$ SELECT CASE WHEN _category = 'مهنية' THEN 'manual_transfers_pro' ELSE 'manual_transfers' END $$;

CREATE OR REPLACE FUNCTION public.form_resource(_form_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT 'form:' || form_key FROM public.forms WHERE id = _form_id $$;

-- النقل اليدوي: صلاحيات منفصلة للمنزلي والمهني
DROP POLICY IF EXISTS "manual_transfers select" ON public.manual_transfers;
DROP POLICY IF EXISTS "manual_transfers insert" ON public.manual_transfers;
DROP POLICY IF EXISTS "manual_transfers update" ON public.manual_transfers;
DROP POLICY IF EXISTS "manual_transfers delete" ON public.manual_transfers;
CREATE POLICY "manual_transfers select" ON public.manual_transfers FOR SELECT TO authenticated
  USING (public.can(auth.uid(), public.manual_resource(category), 'view'));
CREATE POLICY "manual_transfers insert" ON public.manual_transfers FOR INSERT TO authenticated
  WITH CHECK (public.can(auth.uid(), public.manual_resource(category), 'add'));
CREATE POLICY "manual_transfers update" ON public.manual_transfers FOR UPDATE TO authenticated
  USING (public.can(auth.uid(), public.manual_resource(category), 'edit') OR public.can(auth.uid(), public.manual_resource(category), 'delete'))
  WITH CHECK (public.can(auth.uid(), public.manual_resource(category), 'edit') OR public.can(auth.uid(), public.manual_resource(category), 'delete'));
CREATE POLICY "manual_transfers delete" ON public.manual_transfers FOR DELETE TO authenticated
  USING (public.can(auth.uid(), public.manual_resource(category), 'delete'));

-- كل نموذج إضافي له صلاحياته
DROP POLICY IF EXISTS "form_entries select" ON public.form_entries;
DROP POLICY IF EXISTS "form_entries insert" ON public.form_entries;
DROP POLICY IF EXISTS "form_entries update" ON public.form_entries;
DROP POLICY IF EXISTS "form_entries delete" ON public.form_entries;
CREATE POLICY "form_entries select" ON public.form_entries FOR SELECT TO authenticated
  USING (public.can(auth.uid(), public.form_resource(form_id), 'view'));
CREATE POLICY "form_entries insert" ON public.form_entries FOR INSERT TO authenticated
  WITH CHECK (public.can(auth.uid(), public.form_resource(form_id), 'add'));
CREATE POLICY "form_entries update" ON public.form_entries FOR UPDATE TO authenticated
  USING (public.can(auth.uid(), public.form_resource(form_id), 'edit') OR public.can(auth.uid(), public.form_resource(form_id), 'delete'))
  WITH CHECK (public.can(auth.uid(), public.form_resource(form_id), 'edit') OR public.can(auth.uid(), public.form_resource(form_id), 'delete'));
CREATE POLICY "form_entries delete" ON public.form_entries FOR DELETE TO authenticated
  USING (public.can(auth.uid(), public.form_resource(form_id), 'delete'));

CREATE OR REPLACE FUNCTION public.guard_soft_delete()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _res text;
BEGIN
  IF NEW.is_deleted IS DISTINCT FROM OLD.is_deleted THEN
    _res := CASE TG_TABLE_NAME
      WHEN 'workers' THEN 'workers'
      WHEN 'transfers' THEN public.transfer_resource(NEW.category)
      WHEN 'manual_transfers' THEN public.manual_resource(NEW.category)
      WHEN 'form_entries' THEN public.form_resource(NEW.form_id)
      ELSE TG_TABLE_NAME END;
    IF NOT public.can(auth.uid(), _res, 'delete') THEN
      RAISE EXCEPTION 'غير مسموح: ليس لديك صلاحية الحذف';
    END IF;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.complete_transfer(_transfer_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE t RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO t FROM public.transfers WHERE id = _transfer_id;
  IF t IS NULL THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF NOT public.can(auth.uid(), public.transfer_resource(t.category), 'complete') THEN
    RAISE EXCEPTION 'غير مسموح: ليس لديك صلاحية إتمام النقل';
  END IF;
  UPDATE public.workers
    SET current_sponsor_name = t.new_sponsor_name,
        current_sponsor_phone = t.new_sponsor_phone,
        transfer_status = 'تم النقل'
    WHERE id = t.worker_id;
END;
$function$;

-- صفحات الإدارة
DROP POLICY IF EXISTS "Admins insert grid settings" ON public.grid_settings;
DROP POLICY IF EXISTS "Admins update grid settings" ON public.grid_settings;
DROP POLICY IF EXISTS "Admins delete grid settings" ON public.grid_settings;
CREATE POLICY "Admins insert grid settings" ON public.grid_settings FOR INSERT TO authenticated
  WITH CHECK (public.can(auth.uid(), CASE WHEN grid_key = 'page_visibility' THEN 'admin_pages' ELSE 'admin_columns' END, 'view'));
CREATE POLICY "Admins update grid settings" ON public.grid_settings FOR UPDATE TO authenticated
  USING (public.can(auth.uid(), CASE WHEN grid_key = 'page_visibility' THEN 'admin_pages' ELSE 'admin_columns' END, 'view'))
  WITH CHECK (public.can(auth.uid(), CASE WHEN grid_key = 'page_visibility' THEN 'admin_pages' ELSE 'admin_columns' END, 'view'));
CREATE POLICY "Admins delete grid settings" ON public.grid_settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "forms insert admin" ON public.forms;
DROP POLICY IF EXISTS "forms update admin" ON public.forms;
DROP POLICY IF EXISTS "forms delete admin" ON public.forms;
CREATE POLICY "forms insert admin" ON public.forms FOR INSERT TO authenticated WITH CHECK (public.can(auth.uid(), 'admin_forms', 'view'));
CREATE POLICY "forms update admin" ON public.forms FOR UPDATE TO authenticated USING (public.can(auth.uid(), 'admin_forms', 'view')) WITH CHECK (public.can(auth.uid(), 'admin_forms', 'view'));
CREATE POLICY "forms delete admin" ON public.forms FOR DELETE TO authenticated USING (public.can(auth.uid(), 'admin_forms', 'view') AND NOT is_system);

DROP POLICY IF EXISTS "form_fields insert admin" ON public.form_fields;
DROP POLICY IF EXISTS "form_fields update admin" ON public.form_fields;
DROP POLICY IF EXISTS "form_fields delete admin" ON public.form_fields;
CREATE POLICY "form_fields insert admin" ON public.form_fields FOR INSERT TO authenticated WITH CHECK (public.can(auth.uid(), 'admin_forms', 'view'));
CREATE POLICY "form_fields update admin" ON public.form_fields FOR UPDATE TO authenticated USING (public.can(auth.uid(), 'admin_forms', 'view')) WITH CHECK (public.can(auth.uid(), 'admin_forms', 'view'));
CREATE POLICY "form_fields delete admin" ON public.form_fields FOR DELETE TO authenticated USING (public.can(auth.uid(), 'admin_forms', 'view') AND NOT is_system);

DROP POLICY IF EXISTS "form_field_options insert admin" ON public.form_field_options;
DROP POLICY IF EXISTS "form_field_options update admin" ON public.form_field_options;
DROP POLICY IF EXISTS "form_field_options delete admin" ON public.form_field_options;
CREATE POLICY "form_field_options insert admin" ON public.form_field_options FOR INSERT TO authenticated WITH CHECK (public.can(auth.uid(), 'admin_forms', 'view'));
CREATE POLICY "form_field_options update admin" ON public.form_field_options FOR UPDATE TO authenticated USING (public.can(auth.uid(), 'admin_forms', 'view')) WITH CHECK (public.can(auth.uid(), 'admin_forms', 'view'));
CREATE POLICY "form_field_options delete admin" ON public.form_field_options FOR DELETE TO authenticated USING (public.can(auth.uid(), 'admin_forms', 'view'));

DROP POLICY IF EXISTS "Admins read security events" ON public.security_events;
CREATE POLICY "Admins read security events" ON public.security_events FOR SELECT TO authenticated USING (public.can(auth.uid(), 'admin_security', 'view'));

-- نموذج جديد يرث صلاحيات «النماذج الإضافية» كقالب افتراضي
CREATE OR REPLACE FUNCTION public.seed_form_permissions()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.role_permissions (role, resource, action, allowed)
  SELECT role, 'form:' || NEW.form_key, action, allowed FROM public.role_permissions WHERE resource = 'custom_forms'
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS forms_seed_permissions ON public.forms;
CREATE TRIGGER forms_seed_permissions AFTER INSERT ON public.forms FOR EACH ROW EXECUTE FUNCTION public.seed_form_permissions();

-- Backfill: الحفاظ على ما كان مسموحًا سابقًا
INSERT INTO public.role_permissions (role, resource, action, allowed)
SELECT role, 'manual_transfers_pro', action, allowed FROM public.role_permissions WHERE resource = 'manual_transfers'
ON CONFLICT DO NOTHING;
INSERT INTO public.user_permission_overrides (user_id, resource, action, allowed)
SELECT user_id, 'manual_transfers_pro', action, allowed FROM public.user_permission_overrides WHERE resource = 'manual_transfers'
ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role, resource, action, allowed)
SELECT rp.role, 'form:' || f.form_key, rp.action, rp.allowed FROM public.role_permissions rp CROSS JOIN public.forms f
WHERE rp.resource = 'custom_forms' AND NOT f.is_system
ON CONFLICT DO NOTHING;
INSERT INTO public.user_permission_overrides (user_id, resource, action, allowed)
SELECT o.user_id, 'form:' || f.form_key, o.action, o.allowed FROM public.user_permission_overrides o CROSS JOIN public.forms f
WHERE o.resource = 'custom_forms' AND NOT f.is_system
ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (role, resource, action, allowed)
SELECT role, resource, 'complete', allowed FROM public.role_permissions
WHERE action = 'edit' AND resource IN ('workers','transfers','transfers_pro')
ON CONFLICT DO NOTHING;