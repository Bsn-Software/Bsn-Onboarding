'use client'

import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type TriStateValue = 'oui' | 'en_partie' | 'non' | null

export type BilanAnneeItem = {
  item: 'objectifs' | 'initiatives_innovation' | 'performance_globale'
  atteint: TriStateValue
  remarque: string
}

export type ModuleBilanAnneeData = BilanAnneeItem[]

interface ModuleBilanAnneeProps {
  value: ModuleBilanAnneeData
  onChange: (data: ModuleBilanAnneeData) => void
  readOnly?: boolean
}

// ─────────────────────────────────────────────────────────────
// Données statiques
// ─────────────────────────────────────────────────────────────

const LIGNES_FIXES = [
  { id: 'objectifs', libelle: 'Objectifs' },
  { id: 'initiatives_innovation', libelle: 'Initiatives prises et innovation introduites dans le poste' },
  { id: 'performance_globale', libelle: 'Évaluation de performance globale' },
] as const

const OPTIONS_ATTEINT: { value: NonNullable<TriStateValue>; label: string }[] = [
  { value: 'oui', label: 'Oui' },
  { value: 'en_partie', label: 'En partie' },
  { value: 'non', label: 'Non' },
]

export function initBilanAnnee(): ModuleBilanAnneeData {
  return LIGNES_FIXES.map((l) => ({
    item: l.id,
    atteint: null,
    remarque: '',
  }))
}

// ─────────────────────────────────────────────────────────────
// Sous-composant — Sélecteur Tri-state
// ─────────────────────────────────────────────────────────────

function SelecteurAtteint({
  value,
  onChange,
  readOnly,
}: {
  value: TriStateValue
  onChange: (val: TriStateValue) => void
  readOnly?: boolean
}) {
  const handleClick = (v: NonNullable<TriStateValue>) => {
    if (readOnly) return
    onChange(value === v ? null : v)
  }

  const getActiveStyle = (v: NonNullable<TriStateValue>) => {
    switch (v) {
      case 'oui': return 'bg-emerald-500 text-white shadow-sm'
      case 'en_partie': return 'bg-amber-500 text-white shadow-sm'
      case 'non': return 'bg-red-500 text-white shadow-sm'
      default: return ''
    }
  }

  return (
    <div className="flex w-fit items-center gap-px rounded-lg border border-slate-200 bg-white p-0.5">
      {OPTIONS_ATTEINT.map((opt) => {
        const isSelected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            disabled={readOnly}
            onClick={() => handleClick(opt.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              'disabled:pointer-events-none disabled:opacity-60',
              isSelected
                ? getActiveStyle(opt.value)
                : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Composant principal — Module 10
// ─────────────────────────────────────────────────────────────

export function ModuleBilanAnnee({
  value,
  onChange,
  readOnly = false,
}: ModuleBilanAnneeProps) {
  const updateItem = (itemKey: BilanAnneeItem['item'], patch: Partial<BilanAnneeItem>) => {
    if (readOnly) return
    const updated = value.map((it) =>
      it.item === itemKey ? { ...it, ...patch } : it
    )
    onChange(updated)
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-slate-900">Analyse des résultats de l&apos;année</h3>
        <p className="text-xs text-slate-500">
          Évaluez l&apos;atteinte des objectifs passés et la performance globale sur l&apos;année écoulée.
        </p>
      </div>

      <div className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-100 bg-slate-50">
        {LIGNES_FIXES.map((ligne) => {
          const itemData = value.find((v) => v.item === ligne.id) || { item: ligne.id, atteint: null, remarque: '' }

          return (
            <div key={ligne.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-6">
              {/* Libellé et état */}
              <div className="flex w-full flex-col gap-3 sm:w-1/3 sm:shrink-0">
                <span className="text-sm font-medium text-slate-800">
                  {ligne.libelle}
                </span>
                <SelecteurAtteint
                  value={itemData.atteint}
                  onChange={(v) => updateItem(ligne.id, { atteint: v })}
                  readOnly={readOnly}
                />
              </div>

              {/* Remarque */}
              <div className="flex w-full flex-1 flex-col">
                <textarea
                  value={itemData.remarque}
                  onChange={(e) => updateItem(ligne.id, { remarque: e.target.value })}
                  disabled={readOnly}
                  rows={2}
                  placeholder="Remarques et précisions…"
                  className={cn(
                    'w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2',
                    'text-sm text-slate-900 placeholder:text-slate-400',
                    'outline-none transition',
                    'focus:border-[#00b2de] focus:ring-2 focus:ring-[#00b2de]/20',
                    'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
                  )}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
