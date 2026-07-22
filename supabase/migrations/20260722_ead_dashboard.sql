-- ============================================================
-- BSN Onboarding — Module EAD — Dashboard (Module 17)
-- Ajout :
--   1. Colonne bu TEXT NULL sur profiles (source de vérité BU)
--   2. Colonne date_echeance DATE NULL sur ead_entretiens (libre, nullable)
-- Conçu pour être extensible : aucune logique de calcul ici.
-- ============================================================

-- 1. BU sur profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bu TEXT;

-- 2. Échéance sur ead_entretiens (modifiable RH only via la Server Action)
ALTER TABLE public.ead_entretiens ADD COLUMN IF NOT EXISTS date_echeance DATE;
