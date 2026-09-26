CREATE OR REPLACE FUNCTION public.on_transfer_insert()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE w RECORD;
BEGIN
  SELECT current_sponsor_name, current_sponsor_phone INTO w FROM public.workers WHERE id = NEW.worker_id;
  IF NEW.old_sponsor_name = '' THEN NEW.old_sponsor_name := COALESCE(NULLIF(w.current_sponsor_name, ''), 'الشركة'); END IF;
  IF NEW.old_sponsor_phone = '' THEN NEW.old_sponsor_phone := COALESCE(w.current_sponsor_phone, ''); END IF;
  UPDATE public.workers SET transfer_status = 'قيد النقل' WHERE id = NEW.worker_id AND transfer_status <> 'قيد النقل';
  RETURN NEW;
END;
$function$;