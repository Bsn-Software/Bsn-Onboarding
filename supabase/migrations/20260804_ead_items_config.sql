-- ============================================================
-- BSN Onboarding — Module EAD — Configuration des items
-- Table sparse : seuls les items personnalisés ont une ligne.
-- NULL libelle = utilise le libellé par défaut (constante TS).
-- ============================================================

CREATE TABLE public.ead_items_config (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Code stable et explicitement hardcodé dans les constantes TS (jamais calculé par position).
  -- Ex : '1.1', '2.3' pour le comportemental, 'm6-01', 'm7-03' pour le référentiel.
  -- Un réordonnancement des tableaux TypeScript ne décale PAS les personnalisations existantes.
  item_code   TEXT        NOT NULL UNIQUE,
  -- NULL = conserver le libellé par défaut du code TS
  libelle     TEXT,
  -- Uniquement pour les items Module 7 qui ont un sous_libelle (catégorie)
  -- NULL = conserver le sous_libelle par défaut (ou absent si l'item n'en a pas)
  sous_libelle TEXT,
  -- false = item masqué des nouveaux entretiens
  actif       BOOLEAN     NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index sur item_code pour les lookups par code
CREATE INDEX idx_ead_items_config_code ON public.ead_items_config(item_code);

ALTER TABLE public.ead_items_config ENABLE ROW LEVEL SECURITY;

-- SELECT : tous les utilisateurs authentifiés
-- (Managers et Collaborateurs doivent lire la config pour initialiser un nouvel EAD)
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

GRANT ALL ON public.ead_items_config TO service_role;
GRANT SELECT ON public.ead_items_config TO authenticated;
