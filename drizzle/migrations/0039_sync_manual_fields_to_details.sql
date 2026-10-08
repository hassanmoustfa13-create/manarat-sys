CREATE OR REPLACE FUNCTION public.sync_manual_fields_to_details() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE src_key text; det uuid;
BEGIN
  SELECT form_key INTO src_key FROM forms WHERE id=COALESCE(NEW.form_id, OLD.form_id);
  IF src_key NOT IN ('manual_domestic','manual_pro') THEN RETURN NULL; END IF;
  SELECT id INTO det FROM forms WHERE form_key='transfer_details';
  IF det IS NULL THEN RETURN NULL; END IF;
  IF TG_OP='INSERT' THEN
    IF NOT EXISTS (SELECT 1 FROM form_fields WHERE form_id=det AND field_key=NEW.field_key) THEN
      INSERT INTO form_fields(form_id,field_key,label,field_type,required,placeholder,default_value,helper_text,min_value,max_value,sort_order,is_active,column_name,is_system,behavior,section,validation,conditions,settings)
      VALUES (det,NEW.field_key,NEW.label,NEW.field_type,false,'','','',NEW.min_value,NEW.max_value,
        (SELECT COALESCE(max(sort_order),0)+1 FROM form_fields WHERE form_id=det),
        NEW.is_active,NEW.column_name,false,NEW.behavior,'',NEW.validation,NEW.conditions,NEW.settings);
    END IF;
  ELSIF TG_OP='UPDATE' THEN
    UPDATE form_fields SET field_key=NEW.field_key,label=NEW.label,field_type=NEW.field_type,conditions=NEW.conditions,updated_at=now()
    WHERE form_id=det AND field_key=OLD.field_key AND is_system=false;
  ELSIF NOT EXISTS (SELECT 1 FROM form_fields x JOIN forms f ON f.id=x.form_id WHERE f.form_key IN ('manual_domestic','manual_pro') AND x.field_key=OLD.field_key) THEN
    DELETE FROM form_fields WHERE form_id=det AND field_key=OLD.field_key AND is_system=false;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_sync_manual_fields_to_details ON public.form_fields;
CREATE TRIGGER trg_sync_manual_fields_to_details AFTER INSERT OR UPDATE OR DELETE ON public.form_fields
FOR EACH ROW WHEN (pg_trigger_depth() < 2) EXECUTE FUNCTION public.sync_manual_fields_to_details();

INSERT INTO public.form_fields(form_id,field_key,label,field_type,required,placeholder,default_value,helper_text,min_value,max_value,sort_order,is_active,column_name,is_system,behavior,section,validation,conditions,settings)
SELECT DISTINCT ON (ff.field_key) d.id,ff.field_key,ff.label,ff.field_type,false,'','','',ff.min_value,ff.max_value,200+ff.sort_order,ff.is_active,ff.column_name,false,ff.behavior,'',ff.validation,ff.conditions,ff.settings
FROM public.form_fields ff JOIN public.forms f ON f.id=ff.form_id CROSS JOIN (SELECT id FROM public.forms WHERE form_key='transfer_details') d
WHERE f.form_key='manual_domestic' AND ff.is_system=false AND ff.behavior=''
  AND NOT EXISTS (SELECT 1 FROM public.form_fields x WHERE x.form_id=d.id AND (x.field_key=ff.field_key OR (ff.column_name IS NOT NULL AND x.column_name=ff.column_name)));