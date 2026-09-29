CREATE TABLE public.manual_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'منزلية',
  worker_name text NOT NULL DEFAULT '',
  passport_number text NOT NULL DEFAULT '',
  nationality text NOT NULL DEFAULT '',
  visa_number text NOT NULL DEFAULT '',
  old_sponsor_name text NOT NULL DEFAULT '',
  old_sponsor_phone text NOT NULL DEFAULT '',
  new_sponsor_name text NOT NULL DEFAULT '',
  new_sponsor_phone text NOT NULL DEFAULT '',
  visa_type text NOT NULL DEFAULT '',
  transfer_type text NOT NULL DEFAULT '',
  transfer_stage text NOT NULL DEFAULT '',
  transfer_date date,
  period_start date,
  period_end date,
  return_to_office_date date,
  old_sponsor_dues numeric NOT NULL DEFAULT 0,
  down_payment numeric NOT NULL DEFAULT 0,
  remaining_amount numeric GENERATED ALWAYS AS (old_sponsor_dues - down_payment) STORED,
  payment_status text NOT NULL DEFAULT '',
  medical_exam text NOT NULL DEFAULT '',
  residency_status text NOT NULL DEFAULT '',
  residency_number text NOT NULL DEFAULT '',
  salary_dues_status text NOT NULL DEFAULT '',
  salary_dues_amount numeric NOT NULL DEFAULT 0,
  worker_condition text NOT NULL DEFAULT '',
  worker_location text NOT NULL DEFAULT '',
  passport_holder text NOT NULL DEFAULT 'المكتب',
  notes text NOT NULL DEFAULT '',
  is_deleted boolean NOT NULL DEFAULT false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_transfers TO authenticated;
GRANT ALL ON public.manual_transfers TO service_role;
ALTER TABLE public.manual_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manual_transfers select" ON public.manual_transfers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "manual_transfers insert" ON public.manual_transfers FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "manual_transfers update" ON public.manual_transfers FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "manual_transfers delete admin" ON public.manual_transfers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER manual_transfers_audit BEFORE INSERT OR UPDATE ON public.manual_transfers FOR EACH ROW EXECUTE FUNCTION public.stamp_audit();
CREATE TRIGGER manual_transfers_soft_delete_guard BEFORE UPDATE ON public.manual_transfers FOR EACH ROW EXECUTE FUNCTION public.guard_soft_delete();