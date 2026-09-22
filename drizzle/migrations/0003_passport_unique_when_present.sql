ALTER TABLE public.workers DROP CONSTRAINT IF EXISTS workers_passport_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS workers_passport_number_unique
  ON public.workers (passport_number)
  WHERE passport_number <> '';