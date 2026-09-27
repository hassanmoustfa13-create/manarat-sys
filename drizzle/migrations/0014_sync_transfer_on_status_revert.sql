CREATE OR REPLACE FUNCTION public.sync_transfer_on_status_revert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.transfer_status = 'تم النقل' AND NEW.transfer_status <> 'تم النقل' THEN
    UPDATE public.transfers
      SET transfer_stage = NEW.transfer_status
      WHERE worker_id = NEW.id
        AND transfer_stage = 'تم النقل'
        AND new_sponsor_name = OLD.current_sponsor_name;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER workers_status_revert_sync
  AFTER UPDATE ON public.workers
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_transfer_on_status_revert();