ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS other_payments numeric NOT NULL DEFAULT 0;
ALTER TABLE public.manual_transfers ADD COLUMN IF NOT EXISTS other_payments numeric NOT NULL DEFAULT 0;
ALTER TABLE public.transfers ALTER COLUMN remaining_amount SET EXPRESSION AS (old_sponsor_dues - down_payment - other_payments);
ALTER TABLE public.manual_transfers ALTER COLUMN remaining_amount SET EXPRESSION AS (old_sponsor_dues - down_payment - other_payments);