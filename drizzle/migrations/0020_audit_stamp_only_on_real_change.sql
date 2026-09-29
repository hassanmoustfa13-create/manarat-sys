CREATE OR REPLACE FUNCTION public.stamp_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
    NEW.created_at := now();
    -- لا يوجد تعديل بعد: يبقى حقل "تم التعديل بواسطة" فارغًا
    NEW.updated_by := NULL;
    NEW.updated_at := now();
  ELSE
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
    -- لا نسجّل اسم المعدّل إلا إذا تغيّرت بيانات فعلية
    NEW.updated_by := OLD.updated_by;
    NEW.updated_at := OLD.updated_at;
    IF NEW IS DISTINCT FROM OLD THEN
      NEW.updated_by := auth.uid();
      NEW.updated_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;