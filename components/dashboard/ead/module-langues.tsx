'use client'

import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ModuleLanguesData = {
  langues: string[]
  autres_precisions: string
}

interface ModuleLanguesProps {
  value: ModuleLanguesData
  onChange: (data: ModuleLanguesData) => void
  readOnly?: boolean
}

// ─────────────────────────────────────────────────────────────
// Données statiques
// ─────────────────────────────────────────────────────────────

const LANGUES_DEFAUT = [
  'Français',
  'Anglais',
  'Allemand',
  'Espagnol',
  'Chinois',
  'Autre(s)'
]

export function initLangues(): ModuleLanguesData {
  return {
    langues: [],
    autres_precisions: '',
  }
}

// ─────────────────────────────────────────────────────────────
// Composant principal — Module 14
// ─────────────────────────────────────────────────────────────

export function ModuleLangues({
  value,
  onChange,
  readOnly = false,
}: ModuleLanguesProps) {
  
  const toggleLangue = (langue: string) => {
    if (readOnly) return
    const isAutre = langue === 'Autre(s)'
    
    let newLangues: string[]
    let newPrecisions = value.autres_precisions

    if (value.langues.includes(langue)) {
      newLangues = value.langues.filter((l) => l !== langue)
      if (isAutre) newPrecisions = '' // On vide les précisions si on décoche "Autre(s)"
    } else {
      newLangues = [...value.langues, langue]
    }
    
    onChange({ ...value, langues: newLangues, autres_precisions: newPrecisions })
  }

  const hasAutre = value.langues.includes('Autre(s)')

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-slate-900">Langues</h3>
        <p className="text-xs text-slate-500">
          Cochez les langues maîtrisées (cadre professionnel).
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-wrap gap-3">
          {LANGUES_DEFAUT.map((langue) => (
            <label
              key={langue}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition-colors hover:bg-slate-100",
                readOnly && "pointer-events-none opacity-80"
              )}
            >
              <input
                type="checkbox"
                checked={value.langues.includes(langue)}
                onChange={() => toggleLangue(langue)}
                disabled={readOnly}
                className="size-4 rounded border-slate-300 text-[#00b2de] focus:ring-[#00b2de]"
              />
              <span className="text-sm font-medium text-slate-700">{langue}</span>
            </label>
          ))}
        </div>

        {hasAutre && (
          <div className="flex w-full flex-col gap-1 sm:w-64 sm:shrink-0">
            <label className="text-xs font-medium text-slate-700">Précisez :</label>
            <input
              type="text"
              value={value.autres_precisions}
              onChange={(e) => {
                if (!readOnly) onChange({ ...value, autres_precisions: e.target.value })
              }}
              disabled={readOnly}
              placeholder="Italien, Arabe…"
              className={cn(
                'w-full rounded-lg border border-slate-200 bg-white px-3 py-2',
                'text-sm text-slate-900 placeholder:text-slate-400',
                'outline-none transition',
                'focus:border-[#00b2de] focus:ring-2 focus:ring-[#00b2de]/20',
                'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
              )}
            />
          </div>
        )}
      </div>
    </div>
  )
}
