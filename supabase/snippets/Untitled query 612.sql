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
CREATE INDEX idx_ead_notif_dedup     ON public.ead_notifications(entretien_id, type, date_cible);

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
-- ============================================================
-- BSN Onboarding — Module Suivi des Absences
-- Étape B : Table absences + absences_documents + Bucket Storage
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. TABLE : absences
-- ─────────────────────────────────────────────────────────────

CREATE TABLE public.absences (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborateur_id            UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type                        TEXT        NOT NULL CHECK (type IN (
                                            'maladie', 'accident_travail',
                                            'conge_maternite', 'conge_paternite', 'autre'
                                          )),
  date_debut                  DATE        NOT NULL,
  date_fin_prevue             DATE,
  date_fin_reelle             DATE,
  mission_ou_client_concerne  TEXT,
  niveau_de_risque            TEXT        NOT NULL DEFAULT 'aucun'
                                          CHECK (niveau_de_risque IN (
                                            'aucun', 'remplacant_a_prevoir', 'mission_en_danger'
                                          )),
  commentaire                 TEXT,
  declare_par                 UUID        NOT NULL REFERENCES public.profiles(id),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_absences_collaborateur ON public.absences(collaborateur_id);
CREATE INDEX idx_absences_en_cours      ON public.absences(date_debut) WHERE date_fin_reelle IS NULL;

ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;

-- Collaborateur : SELECT sur ses propres absences
CREATE POLICY "Absences - collaborateur ses propres absences" ON public.absences
  FOR SELECT
  USING (collaborateur_id = auth.uid());

-- RH : accès complet
CREATE POLICY "Absences - RH acces complet" ON public.absences
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hr'));

-- Manager : SELECT uniquement sur son équipe
-- (les UPDATE autorisés passent par une Server Action dédiée qui utilise service_role)
CREATE POLICY "Absences - manager lecture equipe" ON public.absences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = absences.collaborateur_id
      AND p.manager_id = auth.uid()
    )
  );

-- Trigger updated_at (réutilise la fonction existante si déjà créée)
CREATE TRIGGER trg_absences_updated_at
  BEFORE UPDATE ON public.absences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT ALL ON public.absences TO authenticated;
GRANT ALL ON public.absences TO service_role;


-- ─────────────────────────────────────────────────────────────
-- 2. TABLE : absences_documents (traçabilité des certificats)
--    Séparée intentionnellement de onboarding_documents pour
--    éviter le déclenchement automatique de copie vers SharePoint.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE public.absences_documents (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  absence_id    UUID        NOT NULL REFERENCES public.absences(id) ON DELETE CASCADE,
  file_url      TEXT        NOT NULL,  -- path dans le bucket absences_documents
  file_name     TEXT        NOT NULL,
  uploaded_by   UUID        NOT NULL REFERENCES public.profiles(id),
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_absences_documents_absence ON public.absences_documents(absence_id);

ALTER TABLE public.absences_documents ENABLE ROW LEVEL SECURITY;

-- Collaborateur : voir ses propres certificats (via l'absence parente)
CREATE POLICY "Absences docs - collaborateur" ON public.absences_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.absences a
      WHERE a.id = absence_id AND a.collaborateur_id = auth.uid()
    )
  );

-- RH : accès complet
CREATE POLICY "Absences docs - RH acces complet" ON public.absences_documents
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hr'));

-- Manager : SELECT sur les certificats de son équipe
CREATE POLICY "Absences docs - manager lecture equipe" ON public.absences_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.absences a
      JOIN public.profiles p ON p.id = a.collaborateur_id
      WHERE a.id = absence_id AND p.manager_id = auth.uid()
    )
  );

-- INSERT : collaborateur pour ses propres absences (ou RH via ALL)
CREATE POLICY "Absences docs - collaborateur insert" ON public.absences_documents
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.absences a
      WHERE a.id = absence_id AND a.collaborateur_id = auth.uid()
    )
  );

GRANT ALL ON public.absences_documents TO authenticated;
GRANT ALL ON public.absences_documents TO service_role;


-- ─────────────────────────────────────────────────────────────
-- 3. Bucket Storage : absences_documents
--    Bucket privé, même pattern de nommage que onboarding_documents
--    (<collaborateur_id>/<uuid>.<extension>)
--    PAS de copie SharePoint — bucket et table totalement séparés.
-- ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'absences_documents',
  'absences_documents',
  false,
  5242880,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Collaborateur : upload de ses propres fichiers
-- Path : <collaborateur_id>/<uuid>.<ext>
CREATE POLICY "Absences storage - collaborateur upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'absences_documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Collaborateur : lecture de ses propres fichiers
CREATE POLICY "Absences storage - collaborateur lecture"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'absences_documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- RH : lecture de tous les fichiers du bucket
CREATE POLICY "Absences storage - RH lecture tous"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'absences_documents' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hr')
  );

-- Manager : lecture des fichiers de son équipe
-- Le premier segment du path = collaborateur_id → on vérifie que ce collab est dans son équipe
CREATE POLICY "Absences storage - manager lecture equipe"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'absences_documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = ((storage.foldername(name))[1])::uuid
      AND p.manager_id = auth.uid()
    )
  );

-- RH : suppression de fichiers
CREATE POLICY "Absences storage - RH suppression"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'absences_documents' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hr')
  );
