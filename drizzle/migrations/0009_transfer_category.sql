ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'منزلية';
CREATE INDEX IF NOT EXISTS idx_transfers_category ON public.transfers(category);