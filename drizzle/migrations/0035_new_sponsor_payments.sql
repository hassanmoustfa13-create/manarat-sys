ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS new_sponsor_dues numeric NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS new_sponsor_payment_status text NOT NULL DEFAULT 'متبقي مبلغ';
ALTER TABLE public.manual_transfers ADD COLUMN IF NOT EXISTS new_sponsor_dues numeric NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS new_sponsor_payment_status text NOT NULL DEFAULT 'متبقي مبلغ';
COMMENT ON COLUMN public.transfers.payment_status IS 'Payment status of office dues to the old sponsor';
COMMENT ON COLUMN public.manual_transfers.payment_status IS 'Payment status of office dues to the old sponsor';