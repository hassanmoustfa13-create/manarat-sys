CREATE TABLE public.departures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_date date,
  flight_time text NOT NULL DEFAULT '',
  office_name text NOT NULL DEFAULT '',
  workers_count integer NOT NULL DEFAULT 0,
  clients text[] NOT NULL DEFAULT '{}',
  visa_clients text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT '—',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  extra jsonb NOT NULL DEFAULT '{}'
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.departures TO authenticated;
GRANT ALL ON public.departures TO service_role;

ALTER TABLE public.departures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "departures select" ON public.departures FOR SELECT TO authenticated USING (can(auth.uid(), 'departures', 'view'));
CREATE POLICY "departures insert" ON public.departures FOR INSERT TO authenticated WITH CHECK (can(auth.uid(), 'departures', 'add'));
CREATE POLICY "departures update" ON public.departures FOR UPDATE TO authenticated USING (can(auth.uid(), 'departures', 'edit') OR can(auth.uid(), 'departures', 'delete')) WITH CHECK (can(auth.uid(), 'departures', 'edit') OR can(auth.uid(), 'departures', 'delete'));
CREATE POLICY "departures delete" ON public.departures FOR DELETE TO authenticated USING (can(auth.uid(), 'departures', 'delete'));

CREATE TRIGGER departures_audit BEFORE INSERT OR UPDATE ON public.departures FOR EACH ROW EXECUTE FUNCTION stamp_audit();

INSERT INTO public.role_permissions (role, resource, action, allowed) VALUES
  ('supervisor','departures','view',true),('supervisor','departures','add',true),('supervisor','departures','edit',true),('supervisor','departures','delete',true),('supervisor','departures','import',false),('supervisor','departures','export',true),
  ('employee','departures','view',true),('employee','departures','add',true),('employee','departures','edit',true),('employee','departures','delete',false),('employee','departures','import',false),('employee','departures','export',true);

WITH f AS (
  INSERT INTO public.forms (form_key, name, route, target_table, is_active, is_system, sort_order, settings)
  VALUES ('departures', 'المغادرة', '/departures', 'departures', true, true, 5, '{"cols":2,"description":"اليوم يُحدَّد تلقائيًا من التاريخ، ويمكن إضافة أكثر من عميل."}'::jsonb)
  RETURNING id
), flds AS (
  INSERT INTO public.form_fields (form_id, field_key, label, field_type, required, placeholder, default_value, helper_text, min_value, max_value, sort_order, is_active, column_name, is_system, behavior, section, validation, conditions, settings)
  SELECT f.id, v.field_key, v.label, v.field_type, v.required, v.placeholder, v.default_value, '', v.min_value, NULL, v.sort_order, true, v.column_name, true, v.behavior, '', '{}'::jsonb, '{}'::jsonb, v.settings
  FROM f, (VALUES
    ('flight_date','التاريخ','date',false,'','',NULL,NULL,1,'flight_date','','{}'::jsonb),
    ('day','اليوم (تلقائي)','text',false,'','',NULL,NULL,2,NULL,'day_name','{}'::jsonb),
    ('flight_time','الوقت','time',false,'','',NULL,NULL,3,'flight_time','','{}'::jsonb),
    ('office_name','اسم المكتب الخارجي','text',false,'','',NULL,NULL,4,'office_name','','{}'::jsonb),
    ('workers_count','عدد العاملات','number',false,'','0',0,NULL,5,'workers_count','','{}'::jsonb),
    ('status','الحالة','select',false,'','—',NULL,NULL,6,'status','','{}'::jsonb),
    ('clients','أسماء العملاء (كل اسم في سطر)','textarea',false,'أحمد محمد
سارة علي
...','',NULL,NULL,7,'clients','clients_lines','{"full":true}'::jsonb)
  ) AS v(field_key,label,field_type,required,placeholder,default_value,min_value,max_value,sort_order,column_name,behavior,settings)
  RETURNING id, field_key
)
INSERT INTO public.form_field_options (field_id, value, label, sort_order, is_active)
SELECT flds.id, o.value, o.value, o.sort_order, true
FROM flds, (VALUES ('—',1),('تم المغادرة',2),('تم الإلغاء',3)) AS o(value, sort_order)
WHERE flds.field_key = 'status';