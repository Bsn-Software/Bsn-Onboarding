'use client'

import {
  BlocEvaluationComportementale,
  type BlocEvaluationData,
} from './bloc-evaluation-comportementale'
import {
  ITEMS_MODULE_3,
  ITEMS_MODULE_4,
  ITEMS_MODULE_5,
} from './items-evaluation'

// ─────────────────────────────────────────────────────────────
// Type unifié — correspond à la colonne JSONB `evaluation`
// dans la table ead_entretiens (CDC §5)
// ─────────────────────────────────────────────────────────────

export type EvaluationComportementaleData = {
  competences_generales: BlocEvaluationData
  sens_du_service: BlocEvaluationData
  expertise_metier: BlocEvaluationData
}

// ─────────────────────────────────────────────────────────────
// Utilitaire — valeur initiale (items à null, commentaires vides)
// ─────────────────────────────────────────────────────────────

export function initEvaluationComportementale(): EvaluationComportementaleData {
  return {
    competences_generales: { items: structuredClone(ITEMS_MODULE_3), commentaire: '' },
    sens_du_service:        { items: structuredClone(ITEMS_MODULE_4), commentaire: '' },
    expertise_metier:       { items: structuredClone(ITEMS_MODULE_5), commentaire: '' },
  }
}

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface SectionEvaluationComportementaleProps {
  value: EvaluationComportementaleData
  onChange: (data: EvaluationComportementaleData) => void
  readOnly?: boolean
}

// ─────────────────────────────────────────────────────────────
// Composant — Section « Collaborateur » du formulaire EAD
// Regroupe les modules 3, 4 et 5 via BlocEvaluationComportementale
// CDC §0 : les bandeaux "Collaborateur" / "BSN Engineering" sont
// des repères visuels, pas des champs — on les matérialise en
// en-tête de section.
// ─────────────────────────────────────────────────────────────

export function SectionEvaluationComportementale({
  value,
  onChange,
  readOnly = false,
}: SectionEvaluationComportementaleProps) {
  const update = (
    key: keyof EvaluationComportementaleData,
    bloc: BlocEvaluationData,
  ) => {
    onChange({ ...value, [key]: bloc })
  }

  // Calcul de la progression globale de la section (pour l'en-tête)
  const tousItems = [
    ...value.competences_generales.items,
    ...value.sens_du_service.items,
    ...value.expertise_metier.items,
  ]
  const total = tousItems.length                           // 21
  const notes = tousItems.filter((i) => i.note !== null).length

  return (
    <div className="flex flex-col gap-1">

      {/* ── Bandeau "Collaborateur" (repère visuel du formulaire papier) ── */}
      <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-slate-200 bg-indigo-600 px-5 py-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-white">
            Collaborateur
          </p>
          <p className="mt-0.5 text-xs text-indigo-200">
            Évaluation comportementale & managériale
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-indigo-200">{notes}/{total} critères</span>
          {/* Barre de progression compacte */}
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-indigo-800">
            <div
              className="h-full rounded-full bg-white transition-all duration-300"
              style={{ width: total > 0 ? `${Math.round((notes / total) * 100)}%` : '0%' }}
            />
          </div>
        </div>
      </div>

      {/* ── Les trois blocs ── */}
      <div className="flex flex-col gap-3 rounded-b-xl border border-slate-200 bg-slate-50/50 p-4">

        {/* Module 3 — Compétences générales */}
        <BlocEvaluationComportementale
          titre="Compétences générales"
          value={value.competences_generales}
          onChange={(bloc) => update('competences_generales', bloc)}
          readOnly={readOnly}
        />

        {/* Module 4 — Sens du service / Relation client */}
        <BlocEvaluationComportementale
          titre="Sens du service / Relation client (interne/externe)"
          value={value.sens_du_service}
          onChange={(bloc) => update('sens_du_service', bloc)}
          readOnly={readOnly}
        />

        {/* Module 5 — Expertise métier */}
        <BlocEvaluationComportementale
          titre="Expertise métier"
          value={value.expertise_metier}
          onChange={(bloc) => update('expertise_metier', bloc)}
          readOnly={readOnly}
        />

      </div>
    </div>
  )
}
