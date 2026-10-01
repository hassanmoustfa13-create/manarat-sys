CREATE TABLE public.sponsor_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  transfer_id uuid NOT NULL,
  sponsor_name text NOT NULL DEFAULT '',
  sponsor_phone text NOT NULL DEFAULT '',
  started_on date,
  ended_on date,
  salary_dues_status text NOT NULL DEFAULT '',
  salary_dues_amount numeric NOT NULL DEFAULT 0,
  remaining_amount numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sponsor_history_transfer_idx ON public.sponsor_history(transfer_id);
GRANT SELECT ON public.sponsor_history TO authenticated;
GRANT ALL ON public.sponsor_history TO service_role;
ALTER TABLE public.sponsor_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view sponsor history" ON public.sponsor_history FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.record_sponsor_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _start date;
BEGIN
  IF COALESCE(OLD.new_sponsor_name, '') = '' OR OLD.new_sponsor_name IS NOT DISTINCT FROM NEW.new_sponsor_name THEN
    RETURN NEW;
  END IF;
  SELECT max(ended_on) INTO _start FROM public.sponsor_history WHERE transfer_id = OLD.id;
  _start := COALESCE(_start, OLD.transfer_date, OLD.created_at::date);
  INSERT INTO public.sponsor_history (source, transfer_id, sponsor_name, sponsor_phone, started_on, ended_on,
    salary_dues_status, salary_dues_amount, remaining_amount, created_by)
  VALUES (TG_TABLE_NAME, OLD.id, OLD.new_sponsor_name, COALESCE(OLD.new_sponsor_phone, ''), _start, CURRENT_DATE,
    COALESCE(OLD.salary_dues_status, ''), COALESCE(OLD.salary_dues_amount, 0), COALESCE(OLD.remaining_amount, 0), auth.uid());
  RETURN NEW;
END $$;

CREATE TRIGGER transfers_sponsor_history AFTER UPDATE ON public.transfers FOR EACH ROW EXECUTE FUNCTION public.record_sponsor_change();
CREATE TRIGGER manual_transfers_sponsor_history AFTER UPDATE ON public.manual_transfers FOR EACH ROW EXECUTE FUNCTION public.record_sponsor_change();

ALTER TABLE public.transfers ADD COLUMN archived_at timestamptz, ADD COLUMN archived_by uuid;
ALTER TABLE public.manual_transfers ADD COLUMN archived_at timestamptz, ADD COLUMN archived_by uuid;