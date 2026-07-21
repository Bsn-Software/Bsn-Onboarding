-- ============================================================
-- BSN Onboarding — Module EAD
-- Étape 13 : Ajout des RLS pour le rôle Manager
-- Un manager doit pouvoir lire/modifier/créer les EAD de son équipe
-- et pouvoir les signer en tant que manager.
-- ============================================================

-- 1. Politiques pour ead_entretiens

-- Le manager peut tout faire sur les entretiens des personnes dont il est le manager
CREATE POLICY "EAD - manager acces complet entretiens equipe" ON public.ead_entretiens
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = ead_entretiens.collaborator_id 
      AND p.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = ead_entretiens.collaborator_id 
      AND p.manager_id = auth.uid()
    )
  );


-- 2. Politiques pour ead_signatures

-- Le manager peut insérer sa signature sur les EAD de son équipe
CREATE POLICY "EAD - manager peut signer" ON public.ead_signatures
  FOR INSERT
  WITH CHECK (
    signe_par = auth.uid()
    AND role_signataire = 'manager'
    AND EXISTS (
      SELECT 1 FROM public.ead_entretiens e
      JOIN public.profiles p ON p.id = e.collaborator_id
      WHERE e.id = entretien_id AND p.manager_id = auth.uid()
    )
  );

-- Le manager peut lire les signatures des EAD de son équipe
CREATE POLICY "EAD - manager lecture signatures equipe" ON public.ead_signatures
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ead_entretiens e
      JOIN public.profiles p ON p.id = e.collaborator_id
      WHERE e.id = entretien_id AND p.manager_id = auth.uid()
    )
  );
