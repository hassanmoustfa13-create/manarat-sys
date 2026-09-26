CREATE TABLE public.grid_settings (
  grid_key TEXT PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grid_settings TO authenticated;
GRANT ALL ON public.grid_settings TO service_role;
ALTER TABLE public.grid_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read grid settings" ON public.grid_settings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins insert grid settings" ON public.grid_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update grid settings" ON public.grid_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete grid settings" ON public.grid_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));