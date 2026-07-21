'use client'

import { Plus, Trash2, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ObjectifSuivantItem = {
  id: string
  objectif: string
  indicateur_reussite: string // "L'objectif est atteint quand..."
  moyens: string
}

export type ModuleObjectifsSuivantsData = ObjectifSuivantItem[]

interface ModuleObjectifsSuivantsProps {
  value: ModuleObjectifsSuivantsData
  onChange: (data: ModuleObjectifsSuivantsData) => void
  readOnly?: boolean
}

// ─────────────────────────────────────────────────────────────
// Utilitaire — initialisation (3 lignes vides par défaut, comme le modèle)
// ─────────────────────────────────────────────────────────────

export function initObjectifsSuivants(): ModuleObjectifsSuivantsData {
  return [
    { id: crypto.randomUUID(), objectif: '', indicateur_reussite: '', moyens: '' },
    { id: crypto.randomUUID(), objectif: '', indicateur_reussite: '', moyens: '' },
    { id: crypto.randomUUID(), objectif: '', indicateur_reussite: '', moyens: '' },
  ]
}

// ─────────────────────────────────────────────────────────────
// Composant principal — Module 11
// ─────────────────────────────────────────────────────────────

export function ModuleObjectifsSuivants({
  value,
  onChange,
  readOnly = false,
}: ModuleObjectifsSuivantsProps) {
  
  const handleAdd = () => {
    if (readOnly) return
    onChange([
      ...value,
      { id: crypto.randomUUID(), objectif: '', indicateur_reussite: '', moyens: '' }
    ])
  }

  const handleRemove = (idToRemove: string) => {
    if (readOnly) return
    onChange(value.filter((item) => item.id !== idToRemove))
  }

  const updateItem = (id: string, patch: Partial<ObjectifSuivantItem>) => {
    if (readOnly) return
    onChange(value.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-slate-900">Fixation des objectifs de l&apos;année suivante</h3>
          <p className="text-xs text-slate-500">
            Définissez les nouveaux objectifs avec leurs critères de réussite et les moyens associés.
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b2de]"
          >
            <Plus className="size-3.5" />
            Ajouter un objectif
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {value.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500">
            Aucun objectif défini.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {value.map((item, index) => (
              <div
                key={item.id}
                className="group relative flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all focus-within:border-[#00b2de]/40 focus-within:ring-4 focus-within:ring-[#00b2de]/5 hover:border-slate-300"
              >
                {/* Entête Ligne (Index + Actions) */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="size-4 text-slate-300" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Objectif {index + 1}
                    </span>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="rounded p-1 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
                      title="Supprimer cet objectif"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>

                {/* Champs de saisie - grille responsive */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700">Objectif visé</label>
                    <textarea
                      value={item.objectif}
                      onChange={(e) => updateItem(item.id, { objectif: e.target.value })}
                      disabled={readOnly}
                      rows={3}
                      placeholder="Description de l'objectif…"
                      className={cn(
                        'w-full resize-none rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2',
                        'text-sm text-slate-900 placeholder:text-slate-400',
                        'outline-none transition',
                        'focus:bg-white focus:border-[#00b2de] focus:ring-2 focus:ring-[#00b2de]/20',
                        'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
                      )}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700">L&apos;objectif est atteint quand…</label>
                    <textarea
                      value={item.indicateur_reussite}
                      onChange={(e) => updateItem(item.id, { indicateur_reussite: e.target.value })}
                      disabled={readOnly}
                      rows={3}
                      placeholder="Indicateurs de réussite…"
                      className={cn(
                        'w-full resize-none rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2',
                        'text-sm text-slate-900 placeholder:text-slate-400',
                        'outline-none transition',
                        'focus:bg-white focus:border-[#00b2de] focus:ring-2 focus:ring-[#00b2de]/20',
                        'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
                      )}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700">Moyens mis en œuvre</label>
                    <textarea
                      value={item.moyens}
                      onChange={(e) => updateItem(item.id, { moyens: e.target.value })}
                      disabled={readOnly}
                      rows={3}
                      placeholder="Moyens, formations, accompagnement…"
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
