'use client'

import { cn } from '@/lib/utils'
import { NoteEchelle, type NoteEchelleValue } from './note-echelle'

// ─────────────────────────────────────────────────────────────
// Types exportés (réutilisés par les modules 3, 4, 5)
// ─────────────────────────────────────────────────────────────

export type EadItemComportemental = {
  code: string           // ex: "1.1"
  libelle: string        // ex: "Sens du résultat..."
  note: NoteEchelleValue // 4 | 3 | 2 | 1 | "NA" | null
}

export type BlocEvaluationData = {
  items: EadItemComportemental[]
  commentaire: string
}

interface BlocEvaluationComportementaleProps {
  /** Titre du bloc, ex: "Compétences générales" */
  titre: string
  /** Données courantes (items + commentaire) */
  value: BlocEvaluationData
  /** Callback — reçoit la structure complète mise à jour */
  onChange: (data: BlocEvaluationData) => void
  /** Mode lecture seule (formulaire signé) */
  readOnly?: boolean
}

// ─────────────────────────────────────────────────────────────
// Calcul de la moyenne (hors N/A et null — CDC §4)
// ─────────────────────────────────────────────────────────────

function calculerMoyenne(items: EadItemComportemental[]): number | null {
  const notesNumeriques = items
    .map((i) => i.note)
    .filter((n): n is 1 | 2 | 3 | 4 => typeof n === 'number')

  if (notesNumeriques.length === 0) return null
  const somme = notesNumeriques.reduce((acc, n) => acc + n, 0)
  return Math.round((somme / notesNumeriques.length) * 10) / 10 // 1 décimale
}

// Classe CSS de la pastille de moyenne selon la valeur
function getMoyenneStyle(moyenne: number): string {
  if (moyenne >= 3.5) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (moyenne >= 2.5) return 'bg-[#00b2de]/10 text-[#00b2de] border-[#00b2de]/20'
  if (moyenne >= 1.5) return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-red-100 text-red-700 border-red-200'
}

// ─────────────────────────────────────────────────────────────
// Légende (CDC §2, Composant A) — affichée une seule fois
// ─────────────────────────────────────────────────────────────

const LEGENDE = [
  { note: '4', color: 'bg-emerald-600', label: 'Très bon', desc: "dépasse ses objectifs, montre l'exemple, transmet et diffuse son savoir-faire" },
  { note: '3', color: 'bg-[#00b2de]',   label: 'Bon',      desc: "satisfait aux exigences du poste et a atteint tous les objectifs fixés" },
  { note: '2', color: 'bg-amber-500',   label: 'Conforme', desc: "satisfait aux exigences du poste mais a besoin de progresser sur certains objectifs" },
  { note: '1', color: 'bg-red-500',     label: 'Insuffisant', desc: "répond en partie aux attentes du poste, plan de progrès à mettre en oeuvre" },
  { note: 'N/A', color: 'bg-slate-400', label: 'N/A',      desc: "non applicable pour le poste ou trop récent pour l'évaluer" },
]

// ─────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────

export function BlocEvaluationComportementale({
  titre,
  value,
  onChange,
  readOnly = false,
}: BlocEvaluationComportementaleProps) {
  const moyenne = calculerMoyenne(value.items)

  // Mise à jour d'un item individuel
  const handleNoteChange = (index: number, note: NoteEchelleValue) => {
    const updatedItems = value.items.map((item, i) =>
      i === index ? { ...item, note } : item
    )
    onChange({ ...value, items: updatedItems })
  }

  // Mise à jour du commentaire
  const handleCommentaireChange = (commentaire: string) => {
    onChange({ ...value, commentaire })
  }

  // Compteur d'items notés (hors N/A — pour le sous-titre)
  const notesRenseignees = value.items.filter((i) => i.note !== null).length

  return (
    <div className="flex flex-col rounded-2xl border border-[#00b2de]/10 bg-white shadow-sm overflow-hidden mb-4">

      {/* ── En-tête du bloc ── */}
      <div className="flex items-center justify-between gap-4 border-b border-[#00b2de]/10 bg-[#00b2de]/[0.03] px-5 py-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">{titre}</h3>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            {notesRenseignees}/{value.items.length} critère{value.items.length > 1 ? 's' : ''} évalué{value.items.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Pastille de moyenne */}
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-xs text-slate-400">Moyenne</span>
          {moyenne !== null ? (
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold tabular-nums',
                getMoyenneStyle(moyenne),
              )}
            >
              {moyenne.toFixed(1)}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-400">
              —
            </span>
          )}
        </div>
      </div>

      {/* ── Légende (statique, une seule fois par bloc comme demandé dans le CDC) ── */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-[#00b2de]/10 bg-[#00b2de]/[0.02] px-5 py-3">
        {LEGENDE.map(({ note, color, label, desc }) => (
          <div key={note} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={cn('size-2.5 rounded-full', color)} />
            <span className="font-bold text-slate-700">{note}</span>
            <span className="hidden sm:inline">— {label}</span>
          </div>
        ))}
      </div>

      {/* ── Liste des items ── */}
      <div className="divide-y divide-[#00b2de]/5">
        {value.items.map((item, index) => (
          <div
            key={item.code}
            className={cn(
              'flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 py-3.5',
              'transition-colors duration-200',
              item.note !== null ? 'bg-[#00b2de]/[0.02]' : 'hover:bg-slate-50/50',
            )}
          >
            {/* Code + libellé */}
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="shrink-0 font-mono text-xs font-medium text-slate-400">
                {item.code}
              </span>
              <span className={cn(
                'text-sm leading-snug',
                item.note !== null ? 'text-slate-800' : 'text-slate-600',
              )}>
                {item.libelle}
              </span>
            </div>

            {/* Sélecteur de note */}
            <div className="shrink-0">
              <NoteEchelle
                id={`note-${item.code}`}
                value={item.note}
                onChange={(note) => handleNoteChange(index, note)}
                readOnly={readOnly}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Commentaire ── */}
      <div className="border-t border-[#00b2de]/10 bg-slate-50/30 px-5 py-4">
        <label
          htmlFor={`commentaire-${titre.toLowerCase().replace(/\s+/g, '-')}`}
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Commentaire / Observations
        </label>
        <textarea
          id={`commentaire-${titre.toLowerCase().replace(/\s+/g, '-')}`}
          value={value.commentaire}
          onChange={(e) => handleCommentaireChange(e.target.value)}
          disabled={readOnly}
          rows={3}
          placeholder="Points forts, axes de progression, observations…"
          className={cn(
            'w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm',
            'text-sm text-slate-900 placeholder:text-slate-300',
            'outline-none transition-all duration-200',
            'hover:border-[#00b2de]/50',
            'focus:border-[#00b2de] focus:ring-4 focus:ring-[#00b2de]/10',
            'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:hover:border-slate-200',
          )}
        />
      </div>
    </div>
  )
}
