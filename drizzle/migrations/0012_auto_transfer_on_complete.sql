CREATE OR REPLACE FUNCTION public.on_transfer_insert()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE w RECORD;
BEGIN
  SELECT current_sponsor_name, current_sponsor_phone INTO w FROM public.workers WHERE id = NEW.worker_id;
  IF NEW.old_sponsor_name = '' THEN NEW.old_sponsor_name := COALESCE(NULLIF(w.current_sponsor_name, ''), 'الشركة'); END IF;
  IF NEW.old_sponsor_phone = '' THEN NEW.old_sponsor_phone := COALESCE(w.current_sponsor_phone, ''); END IF;
  IF COALESCE(current_setting('app.auto_transfer', true), '') <> '1' THEN
    UPDATE public.workers SET transfer_status = 'قيد النقل' WHERE id = NEW.worker_id AND transfer_status <> 'قيد النقل';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_transfer_on_worker_complete()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _old_name text; _old_phone text; _cat text;
BEGIN
  IF NEW.transfer_status <> 'تم النقل' OR COALESCE(NEW.current_sponsor_name, '') = '' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.transfer_status = 'تم النقل'
     AND OLD.current_sponsor_name IS NOT DISTINCT FROM NEW.current_sponsor_name THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.transfers WHERE worker_id = NEW.id AND new_sponsor_name = NEW.current_sponsor_name) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.current_sponsor_name, '') <> '' AND OLD.current_sponsor_name <> NEW.current_sponsor_name THEN
    _old_name := OLD.current_sponsor_name; _old_phone := COALESCE(OLD.current_sponsor_phone, '');
  ELSE
    _old_name := 'الشركة'; _old_phone := '';
  END IF;
  _cat := CASE WHEN NEW.profession IN ('عاملة مهنية', 'مهني') THEN 'مهنية' ELSE 'منزلية' END;
  PERFORM set_config('app.auto_transfer', '1', true);
  INSERT INTO public.transfers (worker_id, old_sponsor_name, old_sponsor_phone, new_sponsor_name, new_sponsor_phone,
    visa_type, transfer_date, transfer_stage, category, payment_status)
  VALUES (NEW.id, _old_name, _old_phone, NEW.current_sponsor_name, COALESCE(NEW.current_sponsor_phone, ''),
    COALESCE(NEW.visa_type, ''), CURRENT_DATE, 'تم النقل', _cat, 'تم الدفع');
  PERFORM set_config('app.auto_transfer', '', true);
  RETURN NEW;
END;
$function$;

CREATE TRIGGER workers_auto_transfer
AFTER INSERT OR UPDATE OF transfer_status, current_sponsor_name ON public.workers
FOR EACH ROW EXECUTE FUNCTION public.auto_transfer_on_worker_complete();