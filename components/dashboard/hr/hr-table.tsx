'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  ArrowUpDown,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  PlusCircle,
  RefreshCw,
  Search,
  UserPlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type ChecklistTemplate,
  type CollaboratorRow,
  getCollaborators,
  getTemplates,
} from '@/app/actions/checklist'
import { InitialsAvatar } from '../shared/initials-avatar'
import { ChecklistSlideover } from './checklist-slideover'
import { NewCollaboratorModal } from './new-collaborator-modal'

// ─────────────────────────────────────────────────────────────
// Couleurs par catégorie pour les badges de progression
// ─────────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { label: string; short: string; color: string; dot: string }> = {
  administrative: { label: 'Administratif', short: 'Admin', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  documents: { label: 'Documents', short: 'Docs', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  health: { label: 'Santé', short: 'Santé', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  it: { label: 'IT', short: 'IT', color: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
  communication: { label: 'Communication', short: 'Social', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  compliance: { label: 'Conformité', short: 'Conf.', color: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-500' },
}

const CATEGORIES = Object.keys(CATEGORY_META)

// ─────────────────────────────────────────────────────────────
// Badge de progression par catégorie
// ─────────────────────────────────────────────────────────────
function CategoryBadge({
  category,
  done,
  total,
}: {
  category: string
  done: number
  total: number
}) {
  const meta = CATEGORY_META[category]
  if (!meta || total === 0) return null
  const allDone = done === total

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm',
        allDone ? 'bg-[#00b2de]/10 text-[#00b2de] border-[#00b2de]/20' : meta.color,
      )}
    >
      <span className={cn("size-1.5 rounded-full", allDone ? "bg-[#00b2de]" : meta.dot)} />
      {meta.short}
      <span className="opacity-70 ml-0.5">
        {done}/{total}
      </span>
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// Barre de progression mini
// ─────────────────────────────────────────────────────────────
function MiniProgress({ value }: { value: number }) {
  const color =
    value >= 100 ? 'bg-[#00b2de]'
      : value >= 60 ? 'bg-amber-400'
        : 'bg-slate-300'

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="tabular-nums text-xs text-slate-500">{value}%</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Composant principal : tableau RH
// ─────────────────────────────────────────────────────────────
export function HRTable({ onViewDetail, phase = 'entry' }: { onViewDetail?: (checklistId: string) => void, phase?: 'entry' | 'exit' }) {
  const [rows, setRows] = useState<CollaboratorRow[]>([])
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_progress' | 'completed'>('all')
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedRow, setSelectedRow] = useState<CollaboratorRow | null>(null)
  const [isPending, startTransition] = useTransition()

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([getCollaborators(), getTemplates(phase)]).then(([c, t]) => {
      let filteredCollabs = c.filter(row => row.phase === phase)
      
      // Si on est sur l'onglet entrées, on masque ceux qui ont déjà un suivi de sortie
      if (phase === 'entry') {
        const exitCollabIds = new Set(c.filter(row => row.phase === 'exit').map(row => row.collaborator?.id))
        filteredCollabs = filteredCollabs.filter(row => !exitCollabIds.has(row.collaborator?.id))
      }

      setRows(filteredCollabs)
      setTemplates(t)
      // Mettre à jour le slide-over si ouvert
      setSelectedRow(prev => {
        if (!prev) return null
        const updated = filteredCollabs.find(r => r.checklist_id === prev.checklist_id)
        return updated || prev
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [phase])

  useEffect(() => { load() }, [load])

  // Filtrage
  const filtered = rows.filter(row => {
    const collab = row.collaborator
    const name = [collab?.first_name, collab?.last_name].filter(Boolean).join(' ').toLowerCase()
    const matchSearch = !search || name.includes(search.toLowerCase()) || collab?.email?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || row.status === filterStatus
    return matchSearch && matchStatus
  })

  // Grouper les templates par catégorie pour les badges
  const templatesByCategory = templates.reduce<Record<string, ChecklistTemplate[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = []
    acc[t.category].push(t)
    return acc
  }, {})

  // Stats header
  const total = rows.length
  const inProgress = rows.filter(r => r.status === 'in_progress').length
  const completed = rows.filter(r => r.status === 'completed').length

  return (
    <div className="flex flex-col gap-4">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Collaborateurs', value: total, color: 'text-slate-900' },
          { label: 'En cours', value: inProgress, color: 'text-amber-600' },
          { label: 'Terminés', value: completed, color: 'text-[#00b2de]' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className={cn('mt-1 text-2xl font-bold tabular-nums', stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Recherche */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un collaborateur…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#00b2de] focus:ring-2 focus:ring-[#00b2de]/20 placeholder:text-slate-400"
          />
        </div>

        {/* Filtre statut */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {(['all', 'in_progress', 'completed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                filterStatus === s
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {s === 'all' ? 'Tous' : s === 'in_progress' ? 'En cours' : 'Terminés'}
            </button>
          ))}
        </div>

        {/* Bouton Nouveau */}
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#00b2de] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0096c7] shadow-sm"
        >
          <UserPlus className="size-3.5" />
          Nouveau collaborateur
        </button>

        {/* Refresh */}
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          Actualiser
        </button>
      </div>

      {/* ── Tableau ── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Chargement des dossiers…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <UserPlus className="size-10 opacity-40" />
            <div className="text-center">
              <p className="font-medium text-slate-600">Aucun collaborateur trouvé</p>
              <p className="text-sm">
                {search ? `Aucun résultat pour "${search}"` : 'Aucun dossier d\'onboarding en cours.'}
              </p>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Collaborateur
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                  Date d'entrée
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                  Progression par catégorie
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Global
                </th>
                <th className="w-32" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(row => {
                const collab = row.collaborator
                const name = [collab?.first_name, collab?.last_name].filter(Boolean).join(' ') || collab?.email || '—'
                const progress = row.total_items > 0
                  ? Math.round((row.completed_items / row.total_items) * 100)
                  : 0

                return (
                  <tr
                    key={row.checklist_id}
                    onClick={() => setSelectedRow(row)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors group"
                  >
                    {/* Nom */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <InitialsAvatar name={name} />
                        <div>
                          <p className="font-medium text-slate-900">{name}</p>
                          {collab?.job_title && (
                            <p className="text-xs text-slate-500">{collab.job_title}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                      {row.entry_date
                        ? new Date(row.entry_date).toLocaleDateString('fr-FR')
                        : <span className="text-slate-300">—</span>
                      }
                    </td>

                    {/* Catégories */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {CATEGORIES.map(cat => {
                          const catTemplates = templatesByCategory[cat] ?? []
                          const done = row.completions.filter(c =>
                            c.completed_at != null &&
                            catTemplates.some(t => t.id === c.template_id)
                          ).length
                          return (
                            <CategoryBadge
                              key={cat}
                              category={cat}
                              done={done}
                              total={catTemplates.length}
                            />
                          )
                        })}
                      </div>
                    </td>

                    {/* Progression globale */}
                    <td className="px-4 py-3">
                      <MiniProgress value={progress} />
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onViewDetail) onViewDetail(row.checklist_id);
                        }}
                        // Ajout de w-full et justify-center ici :
                        className="group flex w-full justify-center items-center gap-1.5 rounded-lg border border-[#00b2de] bg-white px-3 py-2 text-xs font-bold text-[#00b2de] shadow-sm transition-all hover:bg-[#00b2de] hover:text-white hover:shadow-md active:scale-95"
                      >
                        Voir le dossier
                        <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Slide-over ── */}
      {selectedRow && (
        <ChecklistSlideover
          row={selectedRow}
          templates={templates}
          onClose={() => setSelectedRow(null)}
          onRefresh={load}
        />
      )}

      {/* Modal nouveau collaborateur */}
      {showNewModal && (
        <NewCollaboratorModal
          onClose={() => setShowNewModal(false)}
          onCreated={load}
        />
      )}
    </div>
  )
}
