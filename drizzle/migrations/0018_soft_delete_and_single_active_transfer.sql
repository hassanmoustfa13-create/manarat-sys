ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS transfers_one_active_per_worker
  ON public.transfers (worker_id)
  WHERE is_deleted = false AND transfer_stage NOT IN ('تم النقل', 'بدون نقل', 'غير نشط');

CREATE OR REPLACE FUNCTION public.guard_soft_delete()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_deleted IS DISTINCT FROM OLD.is_deleted AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'غير مسموح: الحذف متاح للمدير فقط';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER workers_soft_delete_guard BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION public.guard_soft_delete();
CREATE TRIGGER transfers_soft_delete_guard BEFORE UPDATE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.guard_soft_delete();