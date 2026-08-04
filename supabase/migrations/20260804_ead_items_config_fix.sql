-- ============================================================
-- BSN Onboarding — EAD Items Config — Correctifs
-- 1. Sépare la RLS : SELECT ouvert aux authentifiés, écriture HR seulement
-- 2. Ajoute la colonne sous_libelle (Module 7 — items à deux niveaux)
-- ============================================================

-- ─── 1. Correction RLS ─────────────────────────────────────────

-- Supprimer les policies incorrectes
DROP POLICY IF EXISTS "EAD items config - hr all"         ON public.ead_items_config;
DROP POLICY IF EXISTS "EAD items config - authenticated read" ON public.ead_items_config;

-- SELECT : tous les utilisateurs authentifiés
-- (Managers et Collaborateurs doivent pouvoir lire la config pour initialiser un nouvel EAD)
CREATE POLICY "EAD items config - read authenticated"
  ON public.ead_items_config FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT : RH uniquement
CREATE POLICY "EAD items config - insert hr"
  ON public.ead_items_config FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hr')
  );

-- UPDATE : RH uniquement
CREATE POLICY "EAD items config - update hr"
  ON public.ead_items_config FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hr')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hr')
  );

-- DELETE : RH uniquement
CREATE POLICY "EAD items config - delete hr"
  ON public.ead_items_config FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hr')
  );

-- ─── 2. Ajout colonne sous_libelle ─────────────────────────────
-- Utilisée uniquement pour les items du Module 7 qui ont un sous-libellé
-- (ex : "Gestion de projet", "Estimations investissements"...)
-- NULL = utilise le sous_libelle par défaut du code TS (ou absent si l'item n'en a pas)

ALTER TABLE public.ead_items_config
  ADD COLUMN IF NOT EXISTS sous_libelle TEXT;
