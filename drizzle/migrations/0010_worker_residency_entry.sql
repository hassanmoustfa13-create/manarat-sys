ALTER TABLE public.workers ADD COLUMN residency_status TEXT NOT NULL DEFAULT 'لا يوجد';
ALTER TABLE public.workers ADD COLUMN residency_number TEXT NOT NULL DEFAULT '';
ALTER TABLE public.workers ADD COLUMN entry_date DATE;
COMMENT ON COLUMN public.workers.residency_status IS 'يوجد / لا يوجد — هل لدى العاملة إقامة';
COMMENT ON COLUMN public.workers.residency_number IS 'رقم الإقامة عند وجودها';
COMMENT ON COLUMN public.workers.entry_date IS 'تاريخ دخول العاملة السعودية';