ALTER TABLE public.onboarding_checklists 
ADD COLUMN IF NOT EXISTS active_conditions JSONB DEFAULT '[]'::jsonb;
