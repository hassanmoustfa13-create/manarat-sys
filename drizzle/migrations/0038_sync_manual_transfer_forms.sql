-- unify duplicate key
UPDATE public.manual_transfers SET extra = (extra - 'insurance_status_') || jsonb_build_object('insurance_status', extra->'insurance_status_')
  WHERE extra ? 'insurance_status_' AND NOT extra ? 'insurance_status';
UPDATE public.form_fields SET field_key='insurance_status' WHERE id='a587c017-c5d8-412d-81cb-18c96c074abc';

CREATE OR REPLACE FUNCTION public.manual_sibling_form(_form_id uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT s.id FROM forms f JOIN forms s ON s.form_key = CASE f.form_key WHEN 'manual_domestic' THEN 'manual_pro' WHEN 'manual_pro' THEN 'manual_domestic' END
  WHERE f.id=_form_id $$;

CREATE OR REPLACE FUNCTION public.sync_manual_form_fields() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sib uuid; nid uuid;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NULL; END IF;
  sib := manual_sibling_form(COALESCE(NEW.form_id, OLD.form_id));
  IF sib IS NULL THEN RETURN NULL; END IF;
  IF TG_OP='INSERT' THEN
    IF NOT EXISTS (SELECT 1 FROM form_fields WHERE form_id=sib AND field_key=NEW.field_key) THEN
      INSERT INTO form_fields(form_id,field_key,label,field_type,required,placeholder,default_value,helper_text,min_value,max_value,sort_order,is_active,column_name,is_system,behavior,section,validation,conditions,settings)
      VALUES (sib,NEW.field_key,NEW.label,NEW.field_type,NEW.required,NEW.placeholder,NEW.default_value,NEW.helper_text,NEW.min_value,NEW.max_value,NEW.sort_order,NEW.is_active,NEW.column_name,NEW.is_system,NEW.behavior,NEW.section,NEW.validation,NEW.conditions,NEW.settings);
    END IF;
  ELSIF TG_OP='UPDATE' THEN
    UPDATE form_fields SET field_key=NEW.field_key,label=NEW.label,field_type=NEW.field_type,required=NEW.required,placeholder=NEW.placeholder,default_value=NEW.default_value,helper_text=NEW.helper_text,min_value=NEW.min_value,max_value=NEW.max_value,sort_order=NEW.sort_order,is_active=NEW.is_active,column_name=NEW.column_name,behavior=NEW.behavior,section=NEW.section,validation=NEW.validation,conditions=NEW.conditions,settings=NEW.settings,updated_at=now()
    WHERE form_id=sib AND field_key=OLD.field_key;
  ELSE
    SELECT id INTO nid FROM form_fields WHERE form_id=sib AND field_key=OLD.field_key;
    IF nid IS NOT NULL THEN
      DELETE FROM form_field_options WHERE field_id=nid;
      DELETE FROM form_fields WHERE id=nid;
    END IF;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_sync_manual_form_fields ON public.form_fields;
CREATE TRIGGER trg_sync_manual_form_fields AFTER INSERT OR UPDATE OR DELETE ON public.form_fields
FOR EACH ROW EXECUTE FUNCTION public.sync_manual_form_fields();

-- options (profession options stay separate)
CREATE OR REPLACE FUNCTION public.sync_manual_field_options() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE src form_fields; tgt uuid;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NULL; END IF;
  SELECT * INTO src FROM form_fields WHERE id=COALESCE(NEW.field_id, OLD.field_id);
  IF src.id IS NULL OR src.field_key='profession' OR src.column_name='profession' THEN RETURN NULL; END IF;
  SELECT id INTO tgt FROM form_fields WHERE form_id=manual_sibling_form(src.form_id) AND field_key=src.field_key;
  IF tgt IS NULL THEN RETURN NULL; END IF;
  IF TG_OP='INSERT' THEN
    IF NOT EXISTS (SELECT 1 FROM form_field_options WHERE field_id=tgt AND value=NEW.value) THEN
      INSERT INTO form_field_options(field_id,value,label,sort_order,is_active) VALUES (tgt,NEW.value,NEW.label,NEW.sort_order,NEW.is_active);
    END IF;
  ELSIF TG_OP='UPDATE' THEN
    UPDATE form_field_options SET value=NEW.value,label=NEW.label,sort_order=NEW.sort_order,is_active=NEW.is_active WHERE field_id=tgt AND value=OLD.value;
  ELSE
    DELETE FROM form_field_options WHERE field_id=tgt AND value=OLD.value;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_sync_manual_field_options ON public.form_field_options;
CREATE TRIGGER trg_sync_manual_field_options AFTER INSERT OR UPDATE OR DELETE ON public.form_field_options
FOR EACH ROW EXECUTE FUNCTION public.sync_manual_field_options();

-- backfill fields missing on either side
INSERT INTO public.form_fields(form_id,field_key,label,field_type,required,placeholder,default_value,helper_text,min_value,max_value,sort_order,is_active,column_name,is_system,behavior,section,validation,conditions,settings)
SELECT public.manual_sibling_form(ff.form_id),ff.field_key,ff.label,ff.field_type,ff.required,ff.placeholder,ff.default_value,ff.helper_text,ff.min_value,ff.max_value,ff.sort_order,ff.is_active,ff.column_name,ff.is_system,ff.behavior,ff.section,ff.validation,ff.conditions,ff.settings
FROM public.form_fields ff JOIN public.forms f ON f.id=ff.form_id
WHERE f.form_key IN ('manual_domestic','manual_pro')
  AND NOT EXISTS (SELECT 1 FROM public.form_fields x WHERE x.form_id=public.manual_sibling_form(ff.form_id) AND x.field_key=ff.field_key);

INSERT INTO public.form_field_options(field_id,value,label,sort_order,is_active)
SELECT t.id,o.value,o.label,o.sort_order,o.is_active
FROM public.form_field_options o JOIN public.form_fields s ON s.id=o.field_id JOIN public.forms f ON f.id=s.form_id
JOIN public.form_fields t ON t.form_id=public.manual_sibling_form(s.form_id) AND t.field_key=s.field_key
WHERE f.form_key IN ('manual_domestic','manual_pro') AND s.field_key<>'profession' AND COALESCE(s.column_name,'')<>'profession'
  AND NOT EXISTS (SELECT 1 FROM public.form_field_options y WHERE y.field_id=t.id AND y.value=o.value);