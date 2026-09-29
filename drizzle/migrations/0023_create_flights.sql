CREATE TABLE public.flights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_date date,
  flight_time text NOT NULL DEFAULT '',
  office_name text NOT NULL DEFAULT '',
  workers_count integer NOT NULL DEFAULT 0,
  clients text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'تم الوصول',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flights TO authenticated;
GRANT ALL ON public.flights TO service_role;
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flights select" ON public.flights FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "flights insert" ON public.flights FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "flights update" ON public.flights FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "flights delete admin" ON public.flights FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER flights_stamp_audit BEFORE INSERT OR UPDATE ON public.flights FOR EACH ROW EXECUTE FUNCTION public.stamp_audit();