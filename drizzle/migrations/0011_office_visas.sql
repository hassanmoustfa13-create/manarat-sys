CREATE TABLE public.office_visas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq serial,
  holder_name text NOT NULL DEFAULT '',
  holder_phone text NOT NULL DEFAULT '',
  new_sponsor_name text NOT NULL DEFAULT '',
  new_sponsor_phone text NOT NULL DEFAULT '',
  visa_status text NOT NULL DEFAULT 'لم يتم عمل العقد',
  visa_number text NOT NULL DEFAULT '',
  payment_status text NOT NULL DEFAULT 'لم يتم الدفع',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.office_visas TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.office_visas_seq_seq TO authenticated;
GRANT ALL ON public.office_visas TO service_role;
ALTER TABLE public.office_visas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "office_visas select" ON public.office_visas FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "office_visas insert" ON public.office_visas FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "office_visas update" ON public.office_visas FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "office_visas delete admin" ON public.office_visas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER office_visas_audit BEFORE INSERT OR UPDATE ON public.office_visas FOR EACH ROW EXECUTE FUNCTION public.stamp_audit();