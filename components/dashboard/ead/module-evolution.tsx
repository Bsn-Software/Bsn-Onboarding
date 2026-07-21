'use client'

import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ModuleEvolutionData = {
  dans_annee: string
  sous_2_3_ans: string
}

interface ModuleEvolutionProps {
  value: ModuleEvolutionData
  onChange: (data: ModuleEvolutionData) => void
  readOnly?: boolean
}

export function initEvolution(): ModuleEvolutionData {
  return {
    dans_annee: '',
    sous_2_3_ans: '',
  }
}

// ─────────────────────────────────────────────────────────────
// Composant principal — Module 12
// ─────────────────────────────────────────────────────────────

export function ModuleEvolution({
  value,
  onChange,
  readOnly = false,
}: ModuleEvolutionProps) {
  const update = (patch: Partial<ModuleEvolutionData>) => {
    if (readOnly) return
    onChange({ ...value, ...patch })
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-slate-900">Souhaits d&apos;évolution</h3>
        <p className="text-xs text-slate-500">
          Projetez-vous à court et moyen terme au sein de l&apos;entreprise.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-700">Dans l&apos;année</label>
          <textarea
            value={value.dans_annee}
            onChange={(e) => update({ dans_annee: e.target.value })}
            disabled={readOnly}
            rows={4}
            placeholder="Évolutions souhaitées à court terme…"
            className={cn(
              'w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2',
              'text-sm text-slate-900 placeholder:text-slate-400',
              'outline-none transition',
              'focus:border-[#00b2de] focus:ring-2 focus:ring-[#00b2de]/20',
              'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-700">Sous 2 à 3 ans</label>
          <textarea
            value={value.sous_2_3_ans}
            onChange={(e) => update({ sous_2_3_ans: e.target.value })}
            disabled={readOnly}
            rows={4}
            placeholder="Évolutions souhaitées à moyen terme…"
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
    </div>
  )
}
