-- Module 1: Recruitment requests
CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_date DATE,
  customer_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  profession TEXT NOT NULL DEFAULT '',
  nationality TEXT NOT NULL DEFAULT '',
  request_type TEXT NOT NULL DEFAULT 'استقدام',
  lead_source TEXT NOT NULL DEFAULT '',
  action_status TEXT NOT NULL DEFAULT 'قيد المتابعة',
  pref_age TEXT NOT NULL DEFAULT '',
  pref_religion TEXT NOT NULL DEFAULT '',
  pref_experience TEXT NOT NULL DEFAULT '',
  pref_driving_license TEXT NOT NULL DEFAULT 'لا يوجد',
  pref_languages TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.requests TO authenticated;
GRANT ALL ON public.requests TO service_role;

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "requests select" ON public.requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "requests insert" ON public.requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "requests update" ON public.requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "requests delete admin" ON public.requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER requests_audit BEFORE INSERT OR UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.stamp_audit();

-- Module 2: worker arrival details
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS visa_type TEXT NOT NULL DEFAULT '';
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS arrival_time TEXT NOT NULL DEFAULT '';
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS flight_group TEXT NOT NULL DEFAULT '';
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS arrival_status TEXT NOT NULL DEFAULT 'تم الوصول';
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS current_location TEXT NOT NULL DEFAULT 'الشركة';
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS profession TEXT NOT NULL DEFAULT '';

-- Module 3: transfer operation details
ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS transfer_type TEXT NOT NULL DEFAULT 'إيجار';
ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS transfer_stage TEXT NOT NULL DEFAULT 'إجراءات رفع طلب النقل';
ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS worker_condition TEXT NOT NULL DEFAULT '';
ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS worker_location TEXT NOT NULL DEFAULT 'الشركة';
ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS salary_dues_amount NUMERIC NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_requests_customer ON public.requests (customer_name);
CREATE INDEX IF NOT EXISTS idx_transfers_worker ON public.transfers (worker_id);
