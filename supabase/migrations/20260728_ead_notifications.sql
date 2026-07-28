-- ============================================================
-- BSN Onboarding — Module EAD — Notifications (Étape 15)
-- Renomme date_echeance → date_heure_prevue (TIMESTAMPTZ)
-- Crée la table de log ead_notifications
-- ============================================================

-- 1. Renommer et convertir la colonne
ALTER TABLE public.ead_entretiens
  RENAME COLUMN date_echeance TO date_heure_prevue;

ALTER TABLE public.ead_entretiens
  ALTER COLUMN date_heure_prevue TYPE TIMESTAMPTZ
  USING date_heure_prevue::TIMESTAMPTZ;

-- 2. Table de log des notifications EAD (interne — accès via service_role uniquement pour INSERT)
CREATE TABLE public.ead_notifications (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entretien_id       UUID        NOT NULL REFERENCES public.ead_entretiens(id) ON DELETE CASCADE,
  -- Type de notification
  type               TEXT        NOT NULL CHECK (type IN ('confirmation', 'rappel_j7', 'rappel_j1')),
  -- Date cible sert de clé de dédup : si la date est replanifiée, la date_cible change
  -- et les anciens logs avec l'ancienne date_cible ne matchent plus
  date_cible         DATE        NOT NULL,
  envoye_le          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  destinataire_email TEXT        NOT NULL
);

-- Index pour les lookups de déduplication (utilisés par le cron)
CREATE INDEX idx_ead_notif_entretien ON public.ead_notifications(entretien_id);
CREATE INDEX idx_ead_notif_dedup ON public.ead_notifications(entretien_id, type, date_cible);

-- RLS : activée, mais INSERT uniquement via service_role (Server Actions)
ALTER TABLE public.ead_notifications ENABLE ROW LEVEL SECURITY;

-- Seuls les RH peuvent lire les logs pour audit
CREATE POLICY "EAD notifications - RH lecture"
  ON public.ead_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'hr'
    )
);

-- Le service_role (utilisé par les Server Actions) bypass la RLS automatiquement
GRANT ALL ON public.ead_notifications TO service_role;
GRANT SELECT ON public.ead_notifications TO authenticated;
