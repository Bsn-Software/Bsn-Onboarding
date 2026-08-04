-- ============================================================
-- BSN Onboarding — Module EAD — Configuration des items
-- Table sparse : seuls les items personnalisés ont une ligne.
-- NULL libelle = utilise le libellé par défaut (constante TS).
-- ============================================================

CREATE TABLE public.ead_items_config (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Code stable de l'item : '1.1', '2.3', 'm6-01', etc.
  item_code   TEXT        NOT NULL UNIQUE,
  -- NULL = conserver le libellé par défaut du code TS
  libelle     TEXT,
  -- false = item masqué des nouveaux entretiens
  actif       BOOLEAN     NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index sur item_code pour les lookups par code
CREATE INDEX idx_ead_items_config_code ON public.ead_items_config(item_code);

ALTER TABLE public.ead_items_config ENABLE ROW LEVEL SECURITY;

-- RH : accès complet (lecture + écriture)
CREATE POLICY "EAD items config - hr all"
  ON public.ead_items_config FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hr')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hr')
  );

-- Collaborateurs et Managers : lecture seule (pour afficher les bons libellés dans un EAD)
CREATE POLICY "EAD items config - authenticated read"
  ON public.ead_items_config FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON public.ead_items_config TO service_role;
GRANT SELECT ON public.ead_items_config TO authenticated;
