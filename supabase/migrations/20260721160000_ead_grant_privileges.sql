-- ============================================================
-- BSN Onboarding — Module EAD
-- Étape 13 bis : Ajout des droits d'accès sur les tables EAD
-- ============================================================

GRANT ALL ON public.ead_entretiens TO authenticated;
GRANT ALL ON public.ead_entretiens TO service_role;
GRANT ALL ON public.ead_entretiens TO anon;

GRANT ALL ON public.ead_signatures TO authenticated;
GRANT ALL ON public.ead_signatures TO service_role;
GRANT ALL ON public.ead_signatures TO anon;
