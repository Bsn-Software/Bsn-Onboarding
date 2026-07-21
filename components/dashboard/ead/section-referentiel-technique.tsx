'use client'

import {
  TableauCompetencesTechniques,
  initTableauFromRef,
  type TableauCompetencesData,
} from './tableau-competences-techniques'
import {
  MODULE_6_CONNAISSANCES_TECHNIQUES,
  MODULE_7_COMPETENCES_PROJET,
  MODULE_8_PERIMETRES,
  MODULE_9_SECTEURS,
} from './referentiels'

// ─────────────────────────────────────────────────────────────
// Type unifié — correspond à la clé JSONB `referentiel_technique`
// dans la table ead_entretiens (CDC §5)
// ─────────────────────────────────────────────────────────────

export type ReferentielTechniqueData = {
  connaissances_techniques: TableauCompetencesData // module 6 — 53 items
  competences_projet:       TableauCompetencesData // module 7 — 18 items
  perimetres_intervention:  TableauCompetencesData // module 8 — 11 items
  secteurs_intervention:    TableauCompetencesData // module 9 — 9  items
}

// ─────────────────────────────────────────────────────────────
// Utilitaire — valeur initiale depuis les référentiels statiques
// ─────────────────────────────────────────────────────────────

export function initReferentielTechnique(): ReferentielTechniqueData {
  return {
    connaissances_techniques: initTableauFromRef(MODULE_6_CONNAISSANCES_TECHNIQUES),
    competences_projet:       initTableauFromRef(MODULE_7_COMPETENCES_PROJET),
    perimetres_intervention:  initTableauFromRef(MODULE_8_PERIMETRES),
    secteurs_intervention:    initTableauFromRef(MODULE_9_SECTEURS),
  }
}

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface SectionReferentielTechniqueProps {
  value: ReferentielTechniqueData
  onChange: (data: ReferentielTechniqueData) => void
  readOnly?: boolean
}

// ─────────────────────────────────────────────────────────────
// Composant — Section « BSN Engineering » du formulaire EAD
// Regroupe les modules 6, 7, 8 et 9 via TableauCompetencesTechniques.
// CDC §0 : le bandeau "BSN Engineering" est un repère visuel,
// matérialisé ici en en-tête de section (couleur distincte de "Collaborateur").
// ─────────────────────────────────────────────────────────────

export function SectionReferentielTechnique({
  value,
  onChange,
  readOnly = false,
}: SectionReferentielTechniqueProps) {
  const update = (
    key: keyof ReferentielTechniqueData,
    tableau: TableauCompetencesData,
  ) => {
    onChange({ ...value, [key]: tableau })
  }

  // Progression globale — items renseignés sur total
  const tousItems = [
    ...value.connaissances_techniques,
    ...value.competences_projet,
    ...value.perimetres_intervention,
    ...value.secteurs_intervention,
  ]
  const total = tousItems.length // 91
  const renseignes = tousItems.filter(
    (i) =>
      i.nb_annees !== null ||
      i.principal_secondaire !== null ||
      i.niveau !== null ||
      i.commentaire !== '',
  ).length

  return (
    <div className="flex flex-col gap-1">

      {/* ── Bandeau "BSN Engineering" ── */}
      <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-slate-200 bg-[#00b2de] px-5 py-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-white">
            BSN Engineering
          </p>
          <p className="mt-0.5 text-xs text-blue-100">
            Référentiel de compétences techniques
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-blue-100">{renseignes}/{total} lignes</span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-blue-700">
            <div
              className="h-full rounded-full bg-white transition-all duration-300"
              style={{ width: total > 0 ? `${Math.round((renseignes / total) * 100)}%` : '0%' }}
            />
          </div>
        </div>
      </div>

      {/* ── Les quatre tableaux ── */}
      <div className="flex flex-col gap-6 rounded-b-xl border border-slate-200 bg-slate-50/50 p-4">

        {/* Module 6 — Connaissances techniques principales (53 items) */}
        <TableauCompetencesTechniques
          titre="Connaissances techniques principales"
          value={value.connaissances_techniques}
          onChange={(t) => update('connaissances_techniques', t)}
          readOnly={readOnly}
        />

        {/* Module 7 — Compétences Projet & Gestion (18 items, avec sous-libellé) */}
        <TableauCompetencesTechniques
          titre="Compétences Projet & Gestion"
          value={value.competences_projet}
          onChange={(t) => update('competences_projet', t)}
          avecSousLibelle
          readOnly={readOnly}
        />

        {/* Module 8 — Périmètres d'intervention (11 items) */}
        <TableauCompetencesTechniques
          titre="Périmètres d'intervention"
          value={value.perimetres_intervention}
          onChange={(t) => update('perimetres_intervention', t)}
          readOnly={readOnly}
        />

        {/* Module 9 — Secteurs d'intervention (9 items) */}
        <TableauCompetencesTechniques
          titre="Secteurs d'intervention"
          value={value.secteurs_intervention}
          onChange={(t) => update('secteurs_intervention', t)}
          readOnly={readOnly}
        />

      </div>
    </div>
  )
}
