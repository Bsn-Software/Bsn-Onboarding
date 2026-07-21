'use client'

import { cn } from '@/lib/utils'
import { NiveauMetier, type NiveauMetierValue } from './niveau-metier'
import type { RefItem } from './referentiels'

// ─────────────────────────────────────────────────────────────
// Types exportés (réutilisés par les modules 6, 7, 8, 9)
// ─────────────────────────────────────────────────────────────

export type CompetenceTechniqueItem = {
  ref_id: string                              // lié à RefItem.id
  libelle: string                             // copie depuis le référentiel
  sous_libelle?: string                       // uniquement module 7
  nb_annees: number | null                    // nombre
  principal_secondaire: 'principal' | 'secondaire' | null
  niveau: NiveauMetierValue                   // junior | confirme | senior | expert | null
  commentaire: string                         // text court
}

export type TableauCompetencesData = CompetenceTechniqueItem[]

interface TableauCompetencesTechniquesProps {
  /** Titre du tableau, ex: "Connaissances techniques principales" */
  titre: string
  /** Liste des items avec leur valeur courante */
  value: TableauCompetencesData
  /** Callback — reçoit le tableau mis à jour */
  onChange: (data: TableauCompetencesData) => void
  /** Afficher la colonne sous_libelle (uniquement module 7) */
  avecSousLibelle?: boolean
  /** Mode lecture seule (formulaire signé) */
  readOnly?: boolean
}

// ─────────────────────────────────────────────────────────────
// Légende des niveaux (CDC §2, Composant B)
// Affichée une seule fois au-dessus du premier tableau qui l'utilise
// ─────────────────────────────────────────────────────────────

const NIVEAU_LEGENDE = [
  { niveau: 'Junior',   desc: "Met en oeuvre des connaissances acquises" },
  { niveau: 'Confirmé', desc: "Autonome, met en oeuvre des connaissances lors d'une première expérience" },
  { niveau: 'Senior',   desc: "Possède son métier, peut encadrer une équipe ou un projet" },
  { niveau: 'Expert',   desc: "Référent sur son métier, fait face à des situations nouvelles, fait évoluer méthodes et techniques" },
]

// ─────────────────────────────────────────────────────────────
// Utilitaire — initialiser la liste depuis un référentiel
// ─────────────────────────────────────────────────────────────

export function initTableauFromRef(items: RefItem[]): TableauCompetencesData {
  return items.map((ref) => ({
    ref_id: ref.id,
    libelle: ref.libelle,
    sous_libelle: ref.sous_libelle,
    nb_annees: null,
    principal_secondaire: null,
    niveau: null,
    commentaire: '',
  }))
}

// ─────────────────────────────────────────────────────────────
// Composant sélecteur Principal / Secondaire
// ─────────────────────────────────────────────────────────────

function PrincipalSecondaire({
  value,
  onChange,
  readOnly,
}: {
  value: CompetenceTechniqueItem['principal_secondaire']
  onChange: (v: CompetenceTechniqueItem['principal_secondaire']) => void
  readOnly?: boolean
}) {
  const handleClick = (v: 'principal' | 'secondaire') => {
    if (readOnly) return
    onChange(value === v ? null : v)
  }

  return (
    <div className="flex gap-px rounded-lg border border-slate-200 bg-white p-0.5">
      {(['principal', 'secondaire'] as const).map((opt) => {
        const isSelected = value === opt
        return (
          <button
            key={opt}
            type="button"
            disabled={readOnly}
            onClick={() => handleClick(opt)}
            className={cn(
              'rounded-md px-2 py-1 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              'disabled:pointer-events-none disabled:opacity-60',
              isSelected
                ? 'bg-[#00b2de] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            {opt === 'principal' ? 'P' : 'S'}
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────

export function TableauCompetencesTechniques({
  titre,
  value,
  onChange,
  avecSousLibelle = false,
  readOnly = false,
}: TableauCompetencesTechniquesProps) {
  // Mise à jour d'un item individuel
  const updateItem = (
    index: number,
    patch: Partial<CompetenceTechniqueItem>,
  ) => {
    const updated = value.map((item, i) =>
      i === index ? { ...item, ...patch } : item
    )
    onChange(updated)
  }

  // Comptage des lignes renseignées (au moins un champ non vide)
  const renseignees = value.filter(
    (item) =>
      item.nb_annees !== null ||
      item.principal_secondaire !== null ||
      item.niveau !== null ||
      item.commentaire !== '',
  ).length

  return (
    <div className="flex flex-col gap-3">

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{titre}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {renseignees}/{value.length} compétence{value.length > 1 ? 's' : ''} renseignée{renseignees > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* ── Légende des niveaux ── */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5">
        {NIVEAU_LEGENDE.map(({ niveau, desc }) => (
          <div key={niveau} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{niveau}</span>
            <span className="hidden lg:inline">— {desc}</span>
          </div>
        ))}
      </div>

      {/* ── Tableau (scrollable horizontalement sur petits écrans) ── */}
      <div className="overflow-hidden rounded-2xl border border-[#00b2de]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#00b2de]/10 bg-[#00b2de]/[0.03]">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Compétence
                </th>
                {avecSousLibelle && (
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Spécialisation
                  </th>
                )}
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Nbre d&apos;années
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  P / S
                  <span className="ml-1 font-normal text-slate-400 normal-case">(Principal / Secondaire)</span>
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Niveau
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Commentaire
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#00b2de]/5">
              {value.map((item, index) => {
                const isRenseignee =
                  item.nb_annees !== null ||
                  item.principal_secondaire !== null ||
                  item.niveau !== null ||
                  item.commentaire !== ''

                return (
                  <tr
                    key={item.ref_id}
                    className={cn(
                      'transition-colors duration-200',
                      isRenseignee ? 'bg-[#00b2de]/[0.02]' : 'hover:bg-slate-50/50',
                    )}
                  >
                    {/* Libellé */}
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        'text-sm',
                        isRenseignee ? 'font-medium text-slate-800' : 'text-slate-600',
                      )}>
                        {item.libelle}
                      </span>
                    </td>

                    {/* Sous-libellé (module 7 uniquement) */}
                    {avecSousLibelle && (
                      <td className="px-4 py-2.5 text-xs text-slate-500 italic">
                        {item.sous_libelle ?? '—'}
                      </td>
                    )}

                    {/* Nbre d'années */}
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        step={1}
                        disabled={readOnly}
                        value={item.nb_annees ?? ''}
                        onChange={(e) =>
                          updateItem(index, {
                            nb_annees: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        placeholder="—"
                        className={cn(
                          'w-16 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm',
                          'text-center text-sm font-medium text-slate-900 tabular-nums',
                          'outline-none transition-all duration-200 placeholder:text-slate-300 placeholder:font-normal',
                          'hover:border-[#00b2de]/50',
                          'focus:border-[#00b2de] focus:ring-4 focus:ring-[#00b2de]/10',
                          'disabled:cursor-not-allowed disabled:bg-slate-50/50 disabled:text-slate-400',
                          // Masquer les flèches natives du navigateur
                          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                        )}
                      />
                    </td>

                    {/* Principal / Secondaire */}
                    <td className="px-4 py-2.5">
                      <div className="flex justify-center">
                        <PrincipalSecondaire
                          value={item.principal_secondaire}
                          onChange={(v) => updateItem(index, { principal_secondaire: v })}
                          readOnly={readOnly}
                        />
                      </div>
                    </td>

                    {/* Niveau */}
                    <td className="px-4 py-2.5">
                      <div className="flex justify-center">
                        <NiveauMetier
                          id={`niveau-${item.ref_id}`}
                          value={item.niveau}
                          onChange={(v) => updateItem(index, { niveau: v })}
                          readOnly={readOnly}
                        />
                      </div>
                    </td>

                    {/* Commentaire */}
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.commentaire}
                        onChange={(e) =>
                          updateItem(index, { commentaire: e.target.value })
                        }
                        placeholder="Remarque…"
                        className={cn(
                          'w-full min-w-40 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm',
                          'text-sm font-medium text-slate-900 placeholder:text-slate-300 placeholder:font-normal',
                          'outline-none transition-all duration-200',
                          'hover:border-[#00b2de]/50',
                          'focus:border-[#00b2de] focus:ring-4 focus:ring-[#00b2de]/10',
                          'disabled:cursor-not-allowed disabled:bg-slate-50/50 disabled:text-slate-400',
                        )}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
