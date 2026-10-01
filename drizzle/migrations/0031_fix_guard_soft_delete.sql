CREATE OR REPLACE FUNCTION public.guard_soft_delete()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _res text; _j jsonb;
BEGIN
  IF NEW.is_deleted IS DISTINCT FROM OLD.is_deleted THEN
    _j := to_jsonb(NEW);
    IF TG_TABLE_NAME = 'transfers' THEN _res := public.transfer_resource(_j->>'category');
    ELSIF TG_TABLE_NAME = 'manual_transfers' THEN _res := public.manual_resource(_j->>'category');
    ELSIF TG_TABLE_NAME = 'form_entries' THEN _res := public.form_resource((_j->>'form_id')::uuid);
    ELSE _res := TG_TABLE_NAME; END IF;
    IF NOT public.can(auth.uid(), _res, 'delete') THEN
      RAISE EXCEPTION 'غير مسموح: ليس لديك صلاحية الحذف';
    END IF;
  END IF;
  RETURN NEW;
END $function$;