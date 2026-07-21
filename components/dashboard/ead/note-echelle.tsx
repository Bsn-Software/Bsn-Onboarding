'use client'

import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type NoteEchelleValue = 4 | 3 | 2 | 1 | 'NA' | null

interface NoteEchelleProps {
  /** Valeur courante */
  value: NoteEchelleValue
  /** Callback déclenché au changement */
  onChange: (value: NoteEchelleValue) => void
  /** Désactive toute interaction (mode lecture seule, ex: formulaire signé) */
  readOnly?: boolean
  /** Identifiant unique pour l'accessibilité (role="radiogroup") */
  id?: string
}

// ─────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────

const OPTIONS: { value: NoteEchelleValue; label: string; title: string }[] = [
  { value: 4,    label: '4',   title: "Très bon — dépasse ses objectifs, montre l'exemple, transmet son savoir-faire" },
  { value: 3,    label: '3',   title: "Bon — satisfait aux exigences du poste et a atteint tous les objectifs fixés" },
  { value: 2,    label: '2',   title: "Conforme — satisfait aux exigences mais a besoin de progresser sur certains objectifs" },
  { value: 1,    label: '1',   title: "Insuffisant — répond en partie aux attentes, plan de progrès à mettre en oeuvre" },
  { value: 'NA', label: 'N/A', title: "Non applicable — pour le poste ou trop récent pour l'évaluer" },
]

// Couleur de l'option active selon la note (palette cohérente avec l'app)
function getActiveStyle(note: NoteEchelleValue): string {
  switch (note) {
    case 4:    return 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
    case 3:    return 'bg-[#00b2de] border-[#00b2de] text-white shadow-sm'
    case 2:    return 'bg-amber-500 border-amber-500 text-white shadow-sm'
    case 1:    return 'bg-red-500 border-red-500 text-white shadow-sm'
    case 'NA': return 'bg-slate-500 border-slate-500 text-white shadow-sm'
    default:   return ''
  }
}

// ─────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────

export function NoteEchelle({ value, onChange, readOnly = false, id }: NoteEchelleProps) {
  const handleClick = (note: NoteEchelleValue) => {
    if (readOnly) return
    // Cliquer une deuxième fois sur la note active la désélectionne
    onChange(value === note ? null : note)
  }

  return (
    <div
      role="radiogroup"
      id={id}
      aria-label="Note d'évaluation"
      className="flex items-center gap-1"
    >
      {OPTIONS.map((opt) => {
        const isSelected = value === opt.value
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={opt.title}
            title={opt.title}
            disabled={readOnly}
            onClick={() => handleClick(opt.value)}
            className={cn(
              // Base — reprend le pattern des filtres de statut dans hr-table.tsx
              'rounded-md border px-2.5 py-1 text-xs font-semibold',
              'transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              'disabled:pointer-events-none disabled:opacity-60',
              // État inactif
              !isSelected && 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50',
              // État actif
              isSelected && getActiveStyle(opt.value),
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
