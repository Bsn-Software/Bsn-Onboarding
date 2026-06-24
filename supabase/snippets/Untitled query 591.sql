-- ============================================================
-- BSN Onboarding — Schéma complet v2 (modèle flexible)
-- ⚠️  Supprime et recrée les tables existantes
-- Copiez-collez l'intégralité dans Supabase > SQL Editor
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 0. NETTOYAGE (suppression de l'ancien schéma)
-- ─────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.checklist_completions       CASCADE;
DROP TABLE IF EXISTS public.onboarding_documents        CASCADE;
DROP TABLE IF EXISTS public.onboarding_checklists       CASCADE;
DROP TABLE IF EXISTS public.checklist_item_templates    CASCADE;
DROP TABLE IF EXISTS public.profiles                    CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user()        CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at()         CASCADE;


-- ─────────────────────────────────────────────────────────────
-- 1. TABLE : profiles
-- ─────────────────────────────────────────────────────────────

CREATE TABLE public.profiles (
  id               UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            TEXT        NOT NULL,
  first_name       TEXT,
  last_name        TEXT,
  role             TEXT        NOT NULL DEFAULT 'collaborator'
                               CHECK (role IN ('hr', 'collaborator')),
  job_title        TEXT,
  is_headquarters  BOOLEAN     NOT NULL DEFAULT FALSE,   -- "Collab siège"
  manager_id       UUID        REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role    ON public.profiles(role);
CREATE INDEX idx_profiles_manager ON public.profiles(manager_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profil personnel" ON public.profiles
  FOR ALL
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "RH - lecture tous les profils" ON public.profiles
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hr'));

CREATE POLICY "RH - modification tous les profils" ON public.profiles
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hr'));


-- ─────────────────────────────────────────────────────────────
-- 2. TABLE : onboarding_checklists
--    Un dossier par collaborateur par phase (entrée / sortie)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE public.onboarding_checklists (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phase            TEXT        NOT NULL DEFAULT 'entry'
                               CHECK (phase IN ('entry', 'exit')),
  status           TEXT        NOT NULL DEFAULT 'in_progress'
                               CHECK (status IN ('in_progress', 'completed')),
  entry_date       DATE,
  exit_date        DATE,
  exit_reason      TEXT,       -- Motif de départ (démission, licenciement, RC...)
  hr_notes         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklists_collaborator ON public.onboarding_checklists(collaborator_id);
CREATE INDEX idx_checklists_status       ON public.onboarding_checklists(status);
CREATE INDEX idx_checklists_phase        ON public.onboarding_checklists(phase);

ALTER TABLE public.onboarding_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collaborateur - son dossier" ON public.onboarding_checklists
  FOR SELECT
  USING (collaborator_id = auth.uid());

CREATE POLICY "RH - acces complet checklists" ON public.onboarding_checklists
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hr'));


-- ─────────────────────────────────────────────────────────────
-- 3. TABLE : checklist_item_templates
--    La liste maître configurable des items
-- ─────────────────────────────────────────────────────────────

CREATE TABLE public.checklist_item_templates (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phase                TEXT        NOT NULL CHECK (phase IN ('entry', 'exit')),
  category             TEXT        NOT NULL CHECK (category IN (
                                     'administrative', 'documents',
                                     'health', 'it', 'communication', 'compliance'
                                   )),
  label                TEXT        NOT NULL,
  description          TEXT,
  due_offset           TEXT        CHECK (due_offset IN ('J-7', 'JJ', 'J+1', 'J+7', 'M+2')),
  is_document          BOOLEAN     NOT NULL DEFAULT FALSE,
  is_conditional       BOOLEAN     NOT NULL DEFAULT FALSE,
  condition_label      TEXT,
  headquarters_only    BOOLEAN     NOT NULL DEFAULT FALSE,
  is_required          BOOLEAN     NOT NULL DEFAULT TRUE,
  is_active            BOOLEAN     NOT NULL DEFAULT TRUE,
  order_index          INTEGER     NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_phase_cat ON public.checklist_item_templates(phase, category);

ALTER TABLE public.checklist_item_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture templates authentifié" ON public.checklist_item_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "RH - gestion templates" ON public.checklist_item_templates
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hr'));


-- ─────────────────────────────────────────────────────────────
-- 4. TABLE : checklist_completions
--    Ce qui a été fait, par qui, quand
-- ─────────────────────────────────────────────────────────────

CREATE TABLE public.checklist_completions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id       UUID        NOT NULL REFERENCES public.onboarding_checklists(id) ON DELETE CASCADE,
  template_id        UUID        NOT NULL REFERENCES public.checklist_item_templates(id),
  completed_by       UUID        REFERENCES public.profiles(id),
  completed_at       TIMESTAMPTZ,
  notes              TEXT,
  is_not_applicable  BOOLEAN     NOT NULL DEFAULT FALSE,
  UNIQUE(checklist_id, template_id)
);

CREATE INDEX idx_completions_checklist ON public.checklist_completions(checklist_id);
CREATE INDEX idx_completions_template  ON public.checklist_completions(template_id);

ALTER TABLE public.checklist_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collaborateur - ses completions" ON public.checklist_completions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.onboarding_checklists
    WHERE id = checklist_id AND collaborator_id = auth.uid()
  ));

CREATE POLICY "RH - acces complet completions" ON public.checklist_completions
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hr'));


-- ─────────────────────────────────────────────────────────────
-- 5. TABLE : onboarding_documents
--    Documents avec cycle de vie complet
-- ─────────────────────────────────────────────────────────────

CREATE TABLE public.onboarding_documents (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id      UUID        NOT NULL REFERENCES public.onboarding_checklists(id) ON DELETE CASCADE,
  type              TEXT        NOT NULL CHECK (type IN (
                                  'id_card', 'driver_license', 'rib',
                                  'social_security', 'diploma', 'contract',
                                  'medical_certificate', 'equipment_receipt',
                                  'severance_document', 'other'
                                )),
  file_url          TEXT,
  file_name         TEXT,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'validated', 'rejected')),
  rejection_reason  TEXT,
  validated_by      UUID        REFERENCES public.profiles(id),
  validated_at      TIMESTAMPTZ,
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_checklist ON public.onboarding_documents(checklist_id);
CREATE INDEX idx_documents_status    ON public.onboarding_documents(status);

ALTER TABLE public.onboarding_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collaborateur - ses documents" ON public.onboarding_documents
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.onboarding_checklists
    WHERE id = checklist_id AND collaborator_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.onboarding_checklists
    WHERE id = checklist_id AND collaborator_id = auth.uid()
  ));

CREATE POLICY "RH - acces complet documents" ON public.onboarding_documents
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hr'));


-- ─────────────────────────────────────────────────────────────
-- 6. TRIGGERS
-- ─────────────────────────────────────────────────────────────

-- Création automatique du profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'collaborator')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at automatique
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_checklists_updated_at
  BEFORE UPDATE ON public.onboarding_checklists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON public.onboarding_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 7. DONNÉES INITIALES : checklist_item_templates
-- ─────────────────────────────────────────────────────────────

-- ══════════════ PHASE : ENTRÉE ══════════════

-- Catégorie : Administratif
INSERT INTO public.checklist_item_templates
  (phase, category, label, description, is_document, is_conditional, condition_label, headquarters_only, is_required, order_index)
VALUES
  ('entry','administrative','Créer le dossier Drive du collaborateur',         'Créer le dossier personnel dans Google Drive',                    false, false, null,                                     false, true,  10),
  ('entry','administrative','Fiche d''embauche complétée',                      null,                                                               false, false, null,                                     false, true,  20),
  ('entry','administrative','Habilitation selon le poste',                      'Vérifier si une habilitation spécifique est requise',              false, true,  'Selon le poste',                         false, false, 30),
  ('entry','administrative','ODM (Ordre De Mission)',                            null,                                                               false, false, null,                                     false, true,  40),
  ('entry','administrative','BoondManager — Candidat transformé en ressource',  null,                                                               false, false, null,                                     false, true,  50),
  ('entry','administrative','Mail de bienvenue',                                 'Envoyer le mail de bienvenue au collaborateur',                    false, false, null,                                     false, true,  60),
  ('entry','administrative','DPAE',                                              'Déclaration Préalable À l''Embauche',                              false, false, null,                                     false, true,  70),
  ('entry','administrative','Inscription Club Employés',                         null,                                                               false, false, null,                                     false, true,  80),
  ('entry','administrative','Inscription Edenred+',                              null,                                                               false, false, null,                                     false, true,  90),
  ('entry','administrative','Inscription dans le registre du personnel',         null,                                                               false, false, null,                                     false, true,  100),
  ('entry','administrative','Mettre à jour la liste des travailleurs étrangers', null,                                                               false, true,  'Uniquement si travailleur étranger',     false, false, 110),
  ('entry','administrative','Ajouter au fichier Plan des compétences',           null,                                                               false, false, null,                                     false, true,  120),
  ('entry','administrative','Ajouter au listing des mails',                      null,                                                               false, false, null,                                     false, true,  130),
  ('entry','administrative','Attribuer une ligne téléphonique',                  null,                                                               false, false, null,                                     false, true,  140),
  ('entry','administrative','Lien adhésion mutuelle Swisslife',                  'Envoyer le lien d''adhésion à la mutuelle au collaborateur',       false, false, null,                                     false, true,  150);

-- Catégorie : Documents
INSERT INTO public.checklist_item_templates
  (phase, category, label, description, is_document, is_conditional, condition_label, headquarters_only, is_required, order_index)
VALUES
  ('entry','documents','Pièce d''identité',                          'Carte d''identité ou passeport (recto/verso)', true,  false, null, false, true,  10),
  ('entry','documents','Permis de conduire',                          null,                                           true,  false, null, false, false, 20),
  ('entry','documents','Attestation de sécurité sociale / Vitale',   null,                                           true,  false, null, false, true,  30),
  ('entry','documents','RIB',                                         'Relevé d''identité bancaire pour la paie',     true,  false, null, false, true,  40),
  ('entry','documents','Diplômes',                                    null,                                           true,  false, null, false, false, 50),
  ('entry','documents','Contrat signé',                               null,                                           true,  false, null, false, true,  60);

-- Catégorie : Santé
INSERT INTO public.checklist_item_templates
  (phase, category, label, description, is_document, is_conditional, condition_label, headquarters_only, is_required, order_index)
VALUES
  ('entry','health','Prendre rendez-vous pour la visite médicale',                                     null, false, false, null, false, true, 10),
  ('entry','health','Récupérer l''attestation d''aptitude / inaptitude et l''enregistrer dans le dossier', null, true,  false, null, false, true, 20);

-- Catégorie : IT
INSERT INTO public.checklist_item_templates
  (phase, category, label, description, is_document, is_conditional, condition_label, headquarters_only, is_required, order_index)
VALUES
  ('entry','it','Préparer ou commander le matériel',                              null,                                         false, false, null,                          false, true,  10),
  ('entry','it','Remise du matériel et signature de l''attestation',              null,                                         true,  false, null,                          false, true,  20),
  ('entry','it','Création du compte Google',                                       null,                                         false, false, null,                          false, true,  30),
  ('entry','it','Création du compte BoondManager',                                 null,                                         false, false, null,                          false, true,  40),
  ('entry','it','Google Admin — Ajout aux groupes de diffusion + manager',         null,                                         false, false, null,                          false, true,  50),
  ('entry','it','Google Admin — Ajouter les coordonnées à la fiche Google',        null,                                         false, false, null,                          false, true,  60),
  ('entry','it','Configurer le matériel (créer la session utilisateur)',            'Uniquement si matériel fourni',              false, true,  'Uniquement si matériel fourni', false, false, 70),
  ('entry','it','Mettre à jour GLPI',                                              null,                                         false, false, null,                          false, true,  80);

-- Catégorie : Communication
INSERT INTO public.checklist_item_templates
  (phase, category, label, description, is_document, is_conditional, condition_label, headquarters_only, is_required, order_index)
VALUES
  ('entry','communication','Créer et communiquer la signature email au collaborateur', 'Via Social Link Manager',        false, false, null, true,  true, 10),
  ('entry','communication','Ajouter la description du collaborateur sur l''intranet',  'Via Social Link Manager',        false, false, null, true,  true, 20),
  ('entry','communication','Envoi du mail d''annonce de l''arrivée (Jour J)',           'À envoyer le jour de l''arrivée', false, false, null, false, true, 30);

-- Catégorie : Conformité
INSERT INTO public.checklist_item_templates
  (phase, category, label, description, is_document, is_conditional, condition_label, headquarters_only, is_required, order_index)
VALUES
  ('entry','compliance','Suivi de la sensibilisation qualité et RSE', null, false, false, null, false, true, 10),
  ('entry','compliance','Plan de prévention',                          null, false, false, null, false, true, 20);


-- ══════════════ PHASE : SORTIE ══════════════

-- J-7 — Administratif
INSERT INTO public.checklist_item_templates
  (phase, category, label, description, due_offset, is_document, is_conditional, condition_label, headquarters_only, is_required, order_index)
VALUES
  ('exit','administrative','Informer du départ du collaborateur',              null,                                                                           'J-7', false, false, null,                                                  false, true,  10),
  ('exit','administrative','Courrier de départ transmis au collaborateur',     null,                                                                           'J-7', false, false, null,                                                  false, true,  20),
  ('exit','administrative','Lettre de rupture de la clause de non concurrence',null,                                                                           'J-7', false, true,  'Si clause de non concurrence applicable',             false, false, 30),
  ('exit','administrative','Sortir le collaborateur de la mutuelle',           null,                                                                           'J-7', false, false, null,                                                  false, true,  40),
  ('exit','administrative','Portabilité Mutuelle / Prévoyance',                'À enclencher en cas de licenciement, rupture conventionnelle ou démission légitime', 'J-7', false, true, 'Licenciement, RC ou démission légitime uniquement', false, false, 50);

-- J-7 — IT
INSERT INTO public.checklist_item_templates
  (phase, category, label, description, due_offset, is_document, is_conditional, condition_label, headquarters_only, is_required, order_index)
VALUES
  ('exit','it','Envoyer un mail d''information au collaborateur', 'Voir le template disponible', 'J-7', false, false, null, false, true, 60);

-- JJ — Administratif
INSERT INTO public.checklist_item_templates
  (phase, category, label, description, due_offset, is_document, is_conditional, condition_label, headquarters_only, is_required, order_index)
VALUES
  ('exit','administrative','Demande STC au cabinet comptable',                      null,                            'JJ', false, false, null, false, true, 100),
  ('exit','administrative','Transmettre STC et BM au collaborateur',                'Remise en main propre et/ou LRAR', 'JJ', false, false, null, false, true, 110),
  ('exit','administrative','Remise des documents de sortie au collaborateur (STC)', 'Via TA / BD / ADP',            'JJ', true,  false, null, false, true, 120),
  ('exit','administrative','Sortir le collaborateur du Club Employés',              null,                            'JJ', false, false, null, false, true, 130),
  ('exit','administrative','Sortir le collaborateur d''Edenred+',                   null,                            'JJ', false, false, null, false, true, 140);

-- JJ — IT
INSERT INTO public.checklist_item_templates
  (phase, category, label, description, due_offset, is_document, is_conditional, condition_label, headquarters_only, is_required, order_index)
VALUES
  ('exit','it','Récupérer matériel informatique + EPI et signer l''attestation', null, 'JJ', true,  false, null, false, true, 150),
  ('exit','it','Supprimer la ligne téléphonique',                                  null, 'JJ', false, false, null, false, true, 160);

-- J+1 — Administratif
INSERT INTO public.checklist_item_templates
  (phase, category, label, description, due_offset, is_document, is_conditional, condition_label, headquarters_only, is_required, order_index)
VALUES
  ('exit','administrative','Inscrire la date de départ dans le registre du personnel',                          null, 'J+1', false, false, null,                                 false, true,  200),
  ('exit','administrative','Plan des compétences — Barrer ou supprimer le nom du collaborateur',                null, 'J+1', false, false, null,                                 false, true,  210),
  ('exit','administrative','Drive — Déplacer le dossier du collaborateur dans le dossier Sorties',              null, 'J+1', false, false, null,                                 false, true,  220),
  ('exit','administrative','Sortir le collaborateur des effectifs auprès de la médecine du travail',            null, 'J+1', false, false, null,                                 false, true,  230),
  ('exit','administrative','Mettre à jour la liste des travailleurs étrangers',                                 null, 'J+1', false, true,  'Uniquement si travailleur étranger', false, false, 240),
  ('exit','administrative','BoondManager — Mettre le collaborateur en sortie',                                  null, 'J+1', false, false, null,                                 false, true,  250);

-- J+1 — IT
INSERT INTO public.checklist_item_templates
  (phase, category, label, description, due_offset, is_document, is_conditional, condition_label, headquarters_only, is_required, order_index)
VALUES
  ('exit','it','Désactiver le compte BoondManager',                                        null, 'J+1', false, false, null, false, true, 260),
  ('exit','it','Supprimer le compte Google (hors siège) / Suspendre (siège)',              null, 'J+1', false, false, null, false, true, 270),
  ('exit','it','Réinitialiser le matériel informatique',                                   null, 'J+1', false, false, null, false, true, 280),
  ('exit','it','Mettre à jour GLPI',                                                        null, 'J+1', false, false, null, false, true, 290),
  ('exit','it','Supprimer du listing des mails',                                            null, 'J+1', false, false, null, false, true, 300),
  ('exit','it','Mettre en place le transfert mail vers le manager',                         null, 'J+1', false, false, null, false, true, 310),
  ('exit','it','Planifier la date de suppression définitive du compte Google',              null, 'J+7', false, false, null, false, true, 320);

-- M+2 — IT
INSERT INTO public.checklist_item_templates
  (phase, category, label, description, due_offset, is_document, is_conditional, condition_label, headquarters_only, is_required, order_index)
VALUES
  ('exit','it','Supprimer définitivement le compte Google', null, 'M+2', false, false, null, false, true, 400);


-- ─────────────────────────────────────────────────────────────
-- FIN DU SCRIPT
-- Bucket Storage à créer manuellement :
-- Supabase > Storage > New Bucket > "onboarding-documents" > Privé
-- ─────────────────────────────────────────────────────────────
