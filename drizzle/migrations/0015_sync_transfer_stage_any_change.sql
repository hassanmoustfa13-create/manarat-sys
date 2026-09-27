CREATE OR REPLACE FUNCTION public.sync_transfer_on_status_revert()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.transfer_status IS DISTINCT FROM OLD.transfer_status THEN
    UPDATE public.transfers
      SET transfer_stage = NEW.transfer_status
      WHERE id = (
        SELECT id FROM public.transfers
        WHERE worker_id = NEW.id
          AND new_sponsor_name IN (OLD.current_sponsor_name, NEW.current_sponsor_name)
        ORDER BY created_at DESC LIMIT 1
      )
      AND transfer_stage IS DISTINCT FROM NEW.transfer_status;
  END IF;
  RETURN NEW;
END;
$function$;