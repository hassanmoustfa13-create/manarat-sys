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
  _cat := CASE WHEN COALESCE(NEW.profession, '') = '' OR NEW.profession IN ('عاملة منزلية','مربية أطفال','طباخة','راعية كبار سن','ممرضة منزلية')
               THEN 'منزلية' ELSE 'مهنية' END;
  PERFORM set_config('app.auto_transfer', '1', true);
  INSERT INTO public.transfers (worker_id, old_sponsor_name, old_sponsor_phone, new_sponsor_name, new_sponsor_phone,
    visa_type, transfer_date, transfer_stage, category, payment_status)
  VALUES (NEW.id, _old_name, _old_phone, NEW.current_sponsor_name, COALESCE(NEW.current_sponsor_phone, ''),
    COALESCE(NEW.visa_type, ''), CURRENT_DATE, 'تم النقل', _cat, 'تم الدفع بالكامل');
  PERFORM set_config('app.auto_transfer', '', true);
  RETURN NEW;
END;
$function$;