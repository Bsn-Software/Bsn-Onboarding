ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bu TEXT;
ALTER TABLE public.ead_entretiens ADD COLUMN IF NOT EXISTS date_echeance DATE;
