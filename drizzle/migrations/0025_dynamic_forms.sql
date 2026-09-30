CREATE TABLE public.forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_key text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  route text NOT NULL DEFAULT '',
  target_table text NOT NULL DEFAULT 'form_entries',
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forms TO authenticated;
GRANT ALL ON public.forms TO service_role;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forms select" ON public.forms FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "forms insert admin" ON public.forms FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "forms update admin" ON public.forms FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "forms delete admin" ON public.forms FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') AND NOT is_system);
CREATE TRIGGER forms_audit BEFORE INSERT OR UPDATE ON public.forms FOR EACH ROW EXECUTE FUNCTION public.stamp_audit();

CREATE TABLE public.form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  label text NOT NULL DEFAULT '',
  field_type text NOT NULL DEFAULT 'text',
  required boolean NOT NULL DEFAULT false,
  placeholder text NOT NULL DEFAULT '',
  default_value text NOT NULL DEFAULT '',
  helper_text text NOT NULL DEFAULT '',
  min_value numeric, max_value numeric,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  column_name text,
  is_system boolean NOT NULL DEFAULT false,
  behavior text NOT NULL DEFAULT '',
  section text NOT NULL DEFAULT '',
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (form_id, field_key)
);
CREATE INDEX form_fields_form_idx ON public.form_fields(form_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_fields TO authenticated;
GRANT ALL ON public.form_fields TO service_role;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "form_fields select" ON public.form_fields FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "form_fields insert admin" ON public.form_fields FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "form_fields update admin" ON public.form_fields FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "form_fields delete admin" ON public.form_fields FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') AND NOT is_system);

CREATE TABLE public.form_field_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL REFERENCES public.form_fields(id) ON DELETE CASCADE,
  value text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX form_field_options_field_idx ON public.form_field_options(field_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_field_options TO authenticated;
GRANT ALL ON public.form_field_options TO service_role;
ALTER TABLE public.form_field_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "form_field_options select" ON public.form_field_options FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "form_field_options insert admin" ON public.form_field_options FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "form_field_options update admin" ON public.form_field_options FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "form_field_options delete admin" ON public.form_field_options FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.form_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE RESTRICT,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_deleted boolean NOT NULL DEFAULT false,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX form_entries_form_idx ON public.form_entries(form_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.form_entries TO authenticated;
GRANT ALL ON public.form_entries TO service_role;
ALTER TABLE public.form_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "form_entries select" ON public.form_entries FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "form_entries insert" ON public.form_entries FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "form_entries update" ON public.form_entries FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER form_entries_audit BEFORE INSERT OR UPDATE ON public.form_entries FOR EACH ROW EXECUTE FUNCTION public.stamp_audit();
CREATE TRIGGER form_entries_soft_delete_guard BEFORE UPDATE ON public.form_entries FOR EACH ROW EXECUTE FUNCTION public.guard_soft_delete();

ALTER TABLE public.manual_transfers ADD COLUMN IF NOT EXISTS extra jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.office_visas ADD COLUMN IF NOT EXISTS extra jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.flights ADD COLUMN IF NOT EXISTS extra jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER PUBLICATION supabase_realtime ADD TABLE public.forms, public.form_fields, public.form_field_options, public.form_entries;

CREATE POLICY "form files read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'form-files' AND public.is_staff(auth.uid()));
CREATE POLICY "form files insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'form-files' AND public.is_staff(auth.uid()));