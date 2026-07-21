'use client'

import { Plus, Trash2, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type FormationItem = {
  id: string
  domaine: string
  theme: string
  stage: string
  priorite: string
  justification: string
  contexte: string
}

export type ModuleFormationData = FormationItem[]

interface ModuleFormationProps {
  value: ModuleFormationData
  onChange: (data: ModuleFormationData) => void
  readOnly?: boolean
}

// ─────────────────────────────────────────────────────────────
// Données statiques — Cascading Selects (Domaine -> Thème)
// ─────────────────────────────────────────────────────────────

const DOMAINES_THEMES: Record<string, string[]> = {
  "Compétences transversales": [
    "Langues étrangères",
    "Bureautique / Informatique",
    "Efficacité professionnelle",
    "Communication",
    "Qualité / Sécurité / Environnement (QHSE)"
  ],
  "Management & Leadership": [
    "Nouveaux managers",
    "Management d'équipe",
    "Gestion de projet",
    "Conduite du changement"
  ],
  "Expertise Technique": [
    "Sûreté / Sécurité Nucléaire",
    "Calculs et dimensionnement",
    "Normes et réglementations",
    "Outils métiers (CAO, DAO...)",
    "Autre spécialisation technique"
  ],
  "Autre": [
    "Autre"
  ]
}

const DOMAINES = Object.keys(DOMAINES_THEMES)

const PRIORITES = [
  "Indispensable / Réglementaire",
  "Prioritaire (Lié aux objectifs)",
  "Important (Développement)",
  "Souhaitable (Long terme)"
]

const CONTEXTES = [
  "Adaptation au poste de travail",
  "Évolution / Maintien dans l'emploi",
  "Développement des compétences",
  "Projet spécifique",
  "Autre"
]

// ─────────────────────────────────────────────────────────────
// Utilitaire — initialisation
// ─────────────────────────────────────────────────────────────

export function initPlanFormation(): ModuleFormationData {
  return [] // Vide par défaut, contrairement aux objectifs
}

// ─────────────────────────────────────────────────────────────
// Composant principal — Module 15
// ─────────────────────────────────────────────────────────────

export function ModuleFormation({
  value,
  onChange,
  readOnly = false,
}: ModuleFormationProps) {
  
  const handleAdd = () => {
    if (readOnly) return
    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        domaine: '',
        theme: '',
        stage: '',
        priorite: '',
        justification: '',
        contexte: ''
      }
    ])
  }

  const handleRemove = (idToRemove: string) => {
    if (readOnly) return
    onChange(value.filter((item) => item.id !== idToRemove))
  }

  const updateItem = (id: string, patch: Partial<FormationItem>) => {
    if (readOnly) return
    onChange(
      value.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, ...patch }
        // Règle de gestion : si on change le domaine, on réinitialise le thème
        // car la liste des thèmes dépend du domaine.
        if (patch.domaine !== undefined && patch.domaine !== item.domaine) {
          updated.theme = ''
        }
        return updated
      })
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-slate-900">Plan de formation</h3>
          <p className="text-xs text-slate-500">
            Recensez les besoins en formation pour l&apos;année à venir.
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b2de]"
          >
            <Plus className="size-3.5" />
            Ajouter une formation
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {value.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500">
            Aucun besoin de formation identifié pour le moment.
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {value.map((item, index) => {
              const themesDisponibles = item.domaine ? DOMAINES_THEMES[item.domaine] || [] : []

              return (
                <div
                  key={item.id}
                  className="group relative flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 focus-within:border-[#00b2de]/40 focus-within:ring-4 focus-within:ring-[#00b2de]/5"
                >
                  {/* Entête Ligne */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="size-4 text-slate-300" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Formation {index + 1}
                      </span>
                    </div>
                    {!readOnly && (
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="rounded p-1 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
                        title="Supprimer cette formation"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>

                  {/* Formulaire Grid */}
                  <div className="grid gap-x-4 gap-y-4 md:grid-cols-2">
                    
                    {/* Domaine (Select) */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-slate-700">Domaine</label>
                      <select
                        value={item.domaine}
                        onChange={(e) => updateItem(item.id, { domaine: e.target.value })}
                        disabled={readOnly}
                        className={cn(
                          'w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2',
                          'text-sm text-slate-900',
                          'outline-none transition',
                          'focus:bg-white focus:border-[#00b2de] focus:ring-2 focus:ring-[#00b2de]/20',
                          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
                        )}
                      >
                        <option value="" disabled>Sélectionner un domaine…</option>
                        {DOMAINES.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    {/* Thème (Select conditionnel) */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-slate-700">Thème</label>
                      <select
                        value={item.theme}
                        onChange={(e) => updateItem(item.id, { theme: e.target.value })}
                        disabled={readOnly || !item.domaine}
                        className={cn(
                          'w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2',
                          'text-sm text-slate-900',
                          'outline-none transition',
                          'focus:bg-white focus:border-[#00b2de] focus:ring-2 focus:ring-[#00b2de]/20',
                          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
                        )}
                      >
                        <option value="" disabled>
                          {!item.domaine ? 'Sélectionnez d\'abord un domaine' : 'Sélectionner un thème…'}
                        </option>
                        {themesDisponibles.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    {/* Stage / Titre (Texte libre) */}
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs font-medium text-slate-700">Intitulé exact ou sujet de la formation</label>
                      <input
                        type="text"
                        value={item.stage}
                        onChange={(e) => updateItem(item.id, { stage: e.target.value })}
                        disabled={readOnly}
                        placeholder="Ex: Formation Anglais B2, Habilitation électrique H0B0…"
                        className={cn(
                          'w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2',
                          'text-sm text-slate-900 placeholder:text-slate-400',
                          'outline-none transition',
                          'focus:bg-white focus:border-[#00b2de] focus:ring-2 focus:ring-[#00b2de]/20',
                          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
                        )}
                      />
                    </div>

                    {/* Contexte (Select) */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-slate-700">Dans le cadre du…</label>
                      <select
                        value={item.contexte}
                        onChange={(e) => updateItem(item.id, { contexte: e.target.value })}
                        disabled={readOnly}
                        className={cn(
                          'w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2',
                          'text-sm text-slate-900',
                          'outline-none transition',
                          'focus:bg-white focus:border-[#00b2de] focus:ring-2 focus:ring-[#00b2de]/20',
                          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
                        )}
                      >
                        <option value="" disabled>Sélectionner le contexte…</option>
                        {CONTEXTES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {/* Priorité (Select) */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-slate-700">Niveau de priorité</label>
                      <select
                        value={item.priorite}
                        onChange={(e) => updateItem(item.id, { priorite: e.target.value })}
                        disabled={readOnly}
                        className={cn(
                          'w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2',
                          'text-sm text-slate-900',
                          'outline-none transition',
                          'focus:bg-white focus:border-[#00b2de] focus:ring-2 focus:ring-[#00b2de]/20',
                          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
                        )}
                      >
                        <option value="" disabled>Sélectionner la priorité…</option>
                        {PRIORITES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>

                    {/* Justification (Textarea) */}
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs font-medium text-slate-700">Justification du besoin</label>
                      <textarea
                        value={item.justification}
                        onChange={(e) => updateItem(item.id, { justification: e.target.value })}
                        disabled={readOnly}
                        rows={2}
                        placeholder="Pourquoi cette formation est-elle nécessaire ?"
                        className={cn(
                          'w-full resize-none rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2',
                          'text-sm text-slate-900 placeholder:text-slate-400',
                          'outline-none transition',
                          'focus:bg-white focus:border-[#00b2de] focus:ring-2 focus:ring-[#00b2de]/20',
                          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
                        )}
                      />
                    </div>

                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
