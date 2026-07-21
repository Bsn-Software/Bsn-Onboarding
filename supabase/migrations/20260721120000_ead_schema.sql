-- ============================================================
-- BSN Onboarding — Module EAD (Entretien Annuel de Développement)
-- Étape 1 : modèle de données
-- Convention : mêmes patterns que le schéma initial (gen_random_uuid,
--              set_updated_at trigger, RLS hr / collaborator)
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. TABLE : ead_entretiens
--    Un enregistrement = 1 collaborateur × 1 année.
--    Toutes les données du formulaire sont stockées en JSONB
--    dans des colonnes thématiques (une par grande section du
--    cahier des charges §5), pour rester flexibles sans
--    exploser en dizaines de tables.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE public.ead_entretiens (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rattachement au collaborateur existant (profiles)
  collaborator_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Année de référence de l'entretien (ex: 2026)
  annee                     SMALLINT    NOT NULL CHECK (annee >= 2000 AND annee <= 2100),

  -- Unicité : un seul EAD par collaborateur par année
  UNIQUE (collaborator_id, annee),

  -- Statut du workflow (§4 règles transverses)
  statut                    TEXT        NOT NULL DEFAULT 'brouillon'
                                        CHECK (statut IN ('brouillon', 'soumis', 'signe')),

  -- ── Module 1 — En-tête / Identité ────────────────────────
  -- Champs propres à l'entretien non présents sur profiles
  -- (les champs déjà dans profiles sont lus en lecture seule côté UI)
  identite                  JSONB       NOT NULL DEFAULT '{}'::JSONB,
  -- Schéma attendu :
  -- { "secteur": "", "agence": "", "date_naissance": "",
  --   "bu": "", "date_entree": "", "nb_personnes_encadrees": null,
  --   "coefficient": "", "position": "", "code_fonction": "",
  --   "statut_actuel": "", "emails": [], "date_entretien": "" }

  -- ── Modules 3-5 — Évaluation comportementale (Composant A) ─
  -- Trois blocs : compétences_generales, sens_du_service, expertise_metier
  evaluation                JSONB       NOT NULL DEFAULT '{}'::JSONB,
  -- Schéma attendu par bloc :
  -- { "competences_generales": { "items": [...], "commentaire": "" },
  --   "sens_du_service":        { "items": [...], "commentaire": "" },
  --   "expertise_metier":       { "items": [...], "commentaire": "" } }
  -- Chaque item : { "code": "1.1", "libelle": "...", "note": null }
  -- note : 4 | 3 | 2 | 1 | "NA" | null

  -- ── Modules 6-9 — Référentiel technique BSN (Composant B) ──
  referentiel_technique     JSONB       NOT NULL DEFAULT '{}'::JSONB,
  -- Schéma attendu :
  -- { "connaissances_techniques": [...],  -- x53 items
  --   "competences_projet":       [...],  -- x18 items
  --   "perimetres_intervention":  [...],  -- x11 items
  --   "secteurs_intervention":    [...] } -- x9  items
  -- Chaque item Composant B :
  -- { "libelle": "", "sous_libelle": null,
  --   "nb_annees": null, "principal_secondaire": null,
  --   "niveau": null, "commentaire": "" }

  -- ── Module 10 — Analyse des résultats de l'année ───────────
  bilan_annee               JSONB       NOT NULL DEFAULT '[]'::JSONB,
  -- Schéma attendu :
  -- [ { "item": "objectifs",            "atteint": null, "remarque": "" },
  --   { "item": "initiatives_innovation","atteint": null, "remarque": "" },
  --   { "item": "performance_globale",   "atteint": null, "remarque": "" } ]
  -- atteint : "oui" | "en_partie" | "non" | null

  -- ── Module 11 — Objectifs N+1 ──────────────────────────────
  objectifs_annee_suivante  JSONB       NOT NULL DEFAULT '[]'::JSONB,
  -- Schéma attendu (repeatable_group) :
  -- [ { "objectif": "", "critere_atteinte": "", "moyens": "" } ]

  -- ── Module 12 — Souhaits d'évolution ──────────────────────
  souhaits_evolution        JSONB       NOT NULL DEFAULT '{}'::JSONB,
  -- Schéma attendu :
  -- { "dans_annee": "", "sous_2_3_ans": "" }

  -- ── Module 13 — Mobilité géographique ─────────────────────
  mobilite                  JSONB       NOT NULL DEFAULT '{}'::JSONB,
  -- Schéma attendu :
  -- { "france": [], "international": [] }
  -- france       : subset de ['Est PACA','Ouest','Rhône Alpes','Sud-Ouest']
  -- international: subset des 22 pays listés dans le CDC

  -- ── Module 14 — Langues ────────────────────────────────────
  langues                   JSONB       NOT NULL DEFAULT '[]'::JSONB,
  -- Schéma attendu :
  -- [ { "langue": "Anglais", "autre_libelle": null } ]

  -- ── Module 15 — Plan de formation ─────────────────────────
  plan_formation            JSONB       NOT NULL DEFAULT '[]'::JSONB,
  -- Schéma attendu (repeatable_group) :
  -- [ { "domaine": "", "theme": "", "stage": "",
  --     "priorite": "", "justification": "", "contexte": "" } ]

  -- ── Module 16 — Signatures ────────────────────────────────
  -- Référence vers ead_signatures plutôt qu'en JSONB
  -- (chaque signature a ses propres métadonnées horodatées)

  -- ── Timestamps ────────────────────────────────────────────
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ead_entretiens_collaborator ON public.ead_entretiens(collaborator_id);
CREATE INDEX idx_ead_entretiens_statut       ON public.ead_entretiens(statut);
CREATE INDEX idx_ead_entretiens_annee        ON public.ead_entretiens(annee);

ALTER TABLE public.ead_entretiens ENABLE ROW LEVEL SECURITY;

-- Le collaborateur peut lire et modifier son propre entretien
-- (tant qu'il n'est pas encore signé — le verrouillage est géré côté app)
CREATE POLICY "EAD - collaborateur son propre entretien" ON public.ead_entretiens
  FOR ALL
  USING (collaborator_id = auth.uid())
  WITH CHECK (collaborator_id = auth.uid());

-- Les RH ont accès complet à tous les entretiens
CREATE POLICY "EAD - RH acces complet entretiens" ON public.ead_entretiens
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hr'));

-- Trigger updated_at (réutilise la fonction déjà existante)
CREATE TRIGGER trg_ead_entretiens_updated_at
  BEFORE UPDATE ON public.ead_entretiens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 2. TABLE : ead_signatures
--    Stocke séparément les signatures (module 16).
--    Séparé de ead_entretiens pour :
--    - isoler les données sensibles (image de signature)
--    - horodater indépendamment chaque signature
--    - faciliter le verrouillage du formulaire après double signature
-- ─────────────────────────────────────────────────────────────

CREATE TABLE public.ead_signatures (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entretien_id   UUID        NOT NULL REFERENCES public.ead_entretiens(id) ON DELETE CASCADE,

  -- Rôle du signataire dans le contexte de l'EAD
  role_signataire TEXT        NOT NULL CHECK (role_signataire IN ('collaborateur', 'manager')),

  -- Un seul enregistrement par rôle par entretien
  UNIQUE (entretien_id, role_signataire),

  -- Identité du signataire au moment de la signature
  signe_par      UUID        NOT NULL REFERENCES public.profiles(id),

  -- Données de signature : image base64 ou token (à définir à l'étape 10)
  signature_data TEXT,

  signe_le       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ead_signatures_entretien ON public.ead_signatures(entretien_id);

ALTER TABLE public.ead_signatures ENABLE ROW LEVEL SECURITY;

-- Le collaborateur peut signer (insérer) sa propre signature
CREATE POLICY "EAD - collaborateur peut signer" ON public.ead_signatures
  FOR INSERT
  WITH CHECK (
    signe_par = auth.uid()
    AND role_signataire = 'collaborateur'
    AND EXISTS (
      SELECT 1 FROM public.ead_entretiens
      WHERE id = entretien_id AND collaborator_id = auth.uid()
    )
  );

-- Le collaborateur peut lire les signatures de son entretien
CREATE POLICY "EAD - collaborateur lecture signatures" ON public.ead_signatures
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ead_entretiens
      WHERE id = entretien_id AND collaborator_id = auth.uid()
    )
  );

-- Les RH ont accès complet aux signatures
CREATE POLICY "EAD - RH acces complet signatures" ON public.ead_signatures
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hr'));


-- ─────────────────────────────────────────────────────────────
-- FIN DU SCRIPT — Étape 1 (modèle de données uniquement)
-- Pas d'interface graphique — pas de seed de données de référence
-- (les référentiels modules 6-9 seront seedés à l'étape 6)
-- ─────────────────────────────────────────────────────────────
