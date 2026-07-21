-- ============================================================
-- BSN Onboarding — Module EAD
-- Étape 13 : Restriction de la création (INSERT) d'un EAD
-- ============================================================

-- On supprime l'ancienne politique qui permettait "ALL" (y compris INSERT) au collaborateur
DROP POLICY IF EXISTS "EAD - collaborateur son propre entretien" ON public.ead_entretiens;

-- On recrée les droits pour le collaborateur : SELECT et UPDATE uniquement
CREATE POLICY "EAD - collaborateur lecture son propre entretien" ON public.ead_entretiens
  FOR SELECT
  USING (collaborator_id = auth.uid());

CREATE POLICY "EAD - collaborateur modification son propre entretien" ON public.ead_entretiens
  FOR UPDATE
  USING (collaborator_id = auth.uid())
  WITH CHECK (collaborator_id = auth.uid());

-- Pour la création (INSERT), seuls les RH (via politique "RH acces complet") 
-- et les Managers (via la politique créée dans le fichier précédent) auront le droit.
