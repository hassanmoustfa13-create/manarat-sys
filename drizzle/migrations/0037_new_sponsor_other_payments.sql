ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS new_sponsor_other_payments numeric NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS saudi_entry_date date;
ALTER TABLE public.manual_transfers ADD COLUMN IF NOT EXISTS new_sponsor_other_payments numeric NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS saudi_entry_date date;
CREATE OR REPLACE FUNCTION public.set_new_sponsor_payment_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF COALESCE(NEW.down_payment,0) + COALESCE(NEW.new_sponsor_other_payments,0) >= COALESCE(NEW.new_sponsor_dues,0) THEN
    NEW.new_sponsor_payment_status := 'تم الدفع بالكامل';
  ELSE
    NEW.new_sponsor_payment_status := 'متبقي مبلغ';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER transfers_new_sponsor_status BEFORE INSERT OR UPDATE ON public.transfers FOR EACH ROW EXECUTE FUNCTION public.set_new_sponsor_payment_status();
CREATE TRIGGER manual_transfers_new_sponsor_status BEFORE INSERT OR UPDATE ON public.manual_transfers FOR EACH ROW EXECUTE FUNCTION public.set_new_sponsor_payment_status();