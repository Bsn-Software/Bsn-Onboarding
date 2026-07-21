'use client'

import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type NiveauMetierValue = 'junior' | 'confirme' | 'senior' | 'expert' | null

interface NiveauMetierProps {
  /** Valeur courante */
  value: NiveauMetierValue
  /** Callback déclenché au changement */
  onChange: (value: NiveauMetierValue) => void
  /** Désactive toute interaction (mode lecture seule, ex: formulaire signé) */
  readOnly?: boolean
  /** Identifiant unique pour l'accessibilité */
  id?: string
}

// ─────────────────────────────────────────────────────────────
// Options (CDC §2, légende Composant B)
// ─────────────────────────────────────────────────────────────

const OPTIONS: { value: NiveauMetierValue; label: string; title: string }[] = [
  {
    value: 'junior',
    label: 'Junior',
    title: "Junior — Met en œuvre des connaissances acquises",
  },
  {
    value: 'confirme',
    label: 'Confirmé',
    title: "Confirmé — Autonome, met en œuvre des connaissances lors d'une première expérience",
  },
  {
    value: 'senior',
    label: 'Senior',
    title: "Senior — Possède son métier, peut encadrer une équipe ou un projet",
  },
  {
    value: 'expert',
    label: 'Expert',
    title: "Expert — Référent sur son métier, fait face à des situations nouvelles, fait évoluer méthodes et techniques",
  },
]

// ─────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────

export function NiveauMetier({ value, onChange, readOnly = false, id }: NiveauMetierProps) {
  const handleClick = (niveau: NiveauMetierValue) => {
    if (readOnly) return
    // Cliquer une deuxième fois sur le niveau actif le désélectionne
    onChange(value === niveau ? null : niveau)
  }

  return (
    <div
      role="radiogroup"
      id={id}
      aria-label="Niveau métier"
      // Même pattern que le sélecteur de statut dans hr-table.tsx :
      // groupe de boutons dans un conteneur avec bordure
      className="flex items-center gap-px rounded-lg border border-slate-200 bg-white p-0.5"
    >
      {OPTIONS.map((opt) => {
        const isSelected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={opt.title}
            title={opt.title}
            disabled={readOnly}
            onClick={() => handleClick(opt.value)}
            className={cn(
              // Base
              'rounded-md px-2.5 py-1 text-xs font-medium',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              'disabled:pointer-events-none disabled:opacity-60',
              // État inactif — reprend exactement le pattern du filtre statut dans hr-table
              !isSelected && 'text-slate-600 hover:bg-slate-100',
              // État actif — cohérent avec la couleur primaire de l'app
              isSelected && 'bg-[#00b2de] text-white shadow-sm',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
