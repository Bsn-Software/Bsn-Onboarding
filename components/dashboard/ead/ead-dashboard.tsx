'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardList,
  FileBadge,
  Loader2,
  Plus,
  Pencil,
  Eye,
  CheckCircle2,
  Clock,
  Circle,
  PenLine,
  AlertTriangle,
  Search,
  ChevronDown,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getEadDashboard, createEntretien, updateDateEcheance, type DashboardRow } from '@/app/actions/ead'
import { InitialsAvatar } from '@/components/dashboard/shared/initials-avatar'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from 'sonner'

// ─────────────────────────────────────────────────────────────
// Statut EAD — 4 états détaillés
// ─────────────────────────────────────────────────────────────
type EadStatut = 'non_commence' | 'brouillon' | 'soumis' | 'signe'

function getStatutFromRow(row: DashboardRow): EadStatut {
  if (!row.entretien) return 'non_commence'
  return row.entretien.statut as EadStatut
}

const STATUT_CONFIG: Record<EadStatut, {
  label: string
  color: string
  bg: string
  border: string
  icon: React.ElementType
}> = {
  non_commence: {
    label: 'Non commencé',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    icon: Circle,
  },
  brouillon: {
    label: 'Brouillon',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: PenLine,
  },
  soumis: {
    label: 'En attente signature',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: Clock,
  },
  signe: {
    label: 'Signé',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
}

// ─────────────────────────────────────────────────────────────
// Compteur
// ─────────────────────────────────────────────────────────────
function StatCard({ label, count, color, bg, icon: Icon }: {
  label: string; count: number; color: string; bg: string; icon: React.ElementType
}) {
  return (
    <div className={cn('flex items-center gap-4 rounded-xl border p-4 shadow-sm', bg, 'border-transparent')}>
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', color.replace('text-', 'bg-').replace('700', '100').replace('600', '100'))}>
        <Icon className={cn('size-5', color)} />
      </div>
      <div>
        <p className={cn('text-2xl font-bold tabular-nums', color)}>{count}</p>
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────
export function EadDashboard() {
  const router = useRouter()
  const [rows, setRows] = useState<DashboardRow[]>([])
  const [userRole, setUserRole] = useState<'hr' | 'manager'>('manager')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatingFor, setCreatingFor] = useState<string | null>(null)
  const [updatingEcheance, setUpdatingEcheance] = useState<string | null>(null)

  // Filtres
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatut, setFilterStatut] = useState<EadStatut | 'tous'>('tous')
  const [filterManager, setFilterManager] = useState<string>('tous')
  const [filterBU, setFilterBU] = useState<string>('tous')

  const currentYear = new Date().getFullYear()

  // Chargement initial
  const loadDashboard = async () => {
    setLoading(true)
    setError(null)
    const res = await getEadDashboard()
    if (res.error) {
      setError(res.error)
    } else {
      setRows(res.rows)
      setUserRole(res.userRole)
    }
    setLoading(false)
  }

  useEffect(() => { loadDashboard() }, [])

  // Compteurs (3 catégories pour l'en-tête)
  const counts = useMemo(() => ({
    non_commence: rows.filter(r => getStatutFromRow(r) === 'non_commence').length,
    en_cours: rows.filter(r => ['brouillon', 'soumis'].includes(getStatutFromRow(r))).length,
    signe: rows.filter(r => getStatutFromRow(r) === 'signe').length,
  }), [rows])

  // Listes uniques pour les filtres
  const managers = useMemo(() => {
    const seen = new Set<string>()
    return rows
      .filter(r => r.profile.manager_id && r.profile.manager_first_name)
      .filter(r => {
        const key = r.profile.manager_id!
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map(r => ({
        id: r.profile.manager_id!,
        label: [r.profile.manager_first_name, r.profile.manager_last_name].filter(Boolean).join(' '),
      }))
  }, [rows])

  const bus = useMemo(() => {
    const seen = new Set<string>()
    return rows
      .filter(r => r.profile.bu)
      .filter(r => {
        if (seen.has(r.profile.bu!)) return false
        seen.add(r.profile.bu!)
        return true
      })
      .map(r => r.profile.bu!)
      .sort()
  }, [rows])

  // Filtrage côté client
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const statut = getStatutFromRow(r)
      const fullName = [r.profile.first_name, r.profile.last_name].filter(Boolean).join(' ').toLowerCase()

      if (searchQuery && !fullName.includes(searchQuery.toLowerCase()) && !(r.profile.email.toLowerCase().includes(searchQuery.toLowerCase()))) return false
      if (filterStatut !== 'tous' && statut !== filterStatut) return false
      if (filterManager !== 'tous' && r.profile.manager_id !== filterManager) return false
      if (filterBU !== 'tous' && r.profile.bu !== filterBU) return false
      return true
    })
  }, [rows, searchQuery, filterStatut, filterManager, filterBU])

  // Actions
  const handleCreate = async (row: DashboardRow) => {
    setCreatingFor(row.profile.id)
    const res = await createEntretien(row.profile.id, currentYear)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Entretien créé')
      router.push(`/ead/${res.id}`)
    }
    setCreatingFor(null)
  }

  const handleOpen = (entretienId: string) => {
    router.push(`/ead/${entretienId}`)
  }

  const handleEcheanceChange = async (entretienId: string, dateStr: string) => {
    setUpdatingEcheance(entretienId)
    const res = await updateDateEcheance(entretienId, dateStr || null)
    if (res.error) {
      toast.error(res.error)
    } else {
      // Mise à jour optimiste
      setRows(prev => prev.map(r =>
        r.entretien?.id === entretienId
          ? { ...r, entretien: { ...r.entretien!, date_echeance: dateStr || null } }
          : r
      ))
    }
    setUpdatingEcheance(null)
  }

  // ─── Chargement ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#00b2de]" />
      </div>
    )
  }

  // ─── Erreur ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <AlertTriangle className="size-10 text-amber-500" />
        <p className="text-sm font-medium text-slate-900">Accès refusé</p>
        <p className="text-sm text-slate-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">

      {/* ── En-tête ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-slate-900">
          Suivi des EAD — {currentYear}
        </h1>
        <p className="text-sm text-slate-500">
          {userRole === 'hr'
            ? 'Tous les collaborateurs de la société.'
            : 'Les collaborateurs de votre équipe directe.'}
        </p>
      </div>

      {/* ── Compteurs ─────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Non commencé"
          count={counts.non_commence}
          color="text-slate-600"
          bg="bg-slate-50"
          icon={Circle}
        />
        <StatCard
          label="En cours"
          count={counts.en_cours}
          color="text-amber-700"
          bg="bg-amber-50"
          icon={Clock}
        />
        <StatCard
          label="Terminé"
          count={counts.signe}
          color="text-emerald-700"
          bg="bg-emerald-50"
          icon={CheckCircle2}
        />
      </div>

      {/* ── Filtres ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Recherche */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher un collaborateur…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-sm outline-none transition focus:border-[#00b2de] focus:ring-2 focus:ring-[#00b2de]/20"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Statut */}
        <div className="relative">
          <select
            value={filterStatut}
            onChange={e => setFilterStatut(e.target.value as any)}
            className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-sm text-slate-700 outline-none transition focus:border-[#00b2de] focus:ring-2 focus:ring-[#00b2de]/20"
          >
            <option value="tous">Tous les statuts</option>
            <option value="non_commence">Non commencé</option>
            <option value="brouillon">Brouillon</option>
            <option value="soumis">En attente signature</option>
            <option value="signe">Signé</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Filtre Manager (RH uniquement) */}
        {userRole === 'hr' && managers.length > 0 && (
          <div className="relative">
            <select
              value={filterManager}
              onChange={e => setFilterManager(e.target.value)}
              className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-sm text-slate-700 outline-none transition focus:border-[#00b2de] focus:ring-2 focus:ring-[#00b2de]/20"
            >
              <option value="tous">Tous les managers</option>
              {managers.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>
        )}

        {/* Filtre BU */}
        {bus.length > 0 && (
          <div className="relative">
            <select
              value={filterBU}
              onChange={e => setFilterBU(e.target.value)}
              className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-sm text-slate-700 outline-none transition focus:border-[#00b2de] focus:ring-2 focus:ring-[#00b2de]/20"
            >
              <option value="tous">Toutes les BU</option>
              {bus.map(bu => <option key={bu} value={bu}>{bu}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>
        )}

        {/* Compteur résultat */}
        {(searchQuery || filterStatut !== 'tous' || filterManager !== 'tous' || filterBU !== 'tous') && (
          <span className="text-xs text-slate-500">{filteredRows.length} résultat{filteredRows.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {/* ── Tableau ───────────────────────────────────────────── */}
      {filteredRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <FileBadge className="size-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-900">
            {rows.length === 0
              ? userRole === 'manager'
                ? "Aucun collaborateur dans votre équipe directe."
                : "Aucun collaborateur enregistré."
              : "Aucun résultat pour ces filtres."}
          </p>
          <p className="text-xs text-slate-400">
            {rows.length === 0 && userRole === 'hr'
              ? "Créez d'abord des collaborateurs via le suivi des entrées."
              : ""}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Collaborateur</th>
                  {userRole === 'hr' && (
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Manager</th>
                  )}
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">BU</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut EAD {currentYear}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Mis à jour</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Échéance</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map(row => {
                  const statut = getStatutFromRow(row)
                  const cfg = STATUT_CONFIG[statut]
                  const fullName = [row.profile.first_name, row.profile.last_name].filter(Boolean).join(' ') || row.profile.email
                  const managerName = [row.profile.manager_first_name, row.profile.manager_last_name].filter(Boolean).join(' ')
                  const updatedAt = row.entretien ? new Date(row.entretien.updated_at).toLocaleDateString('fr-FR') : null
                  const echeanceStr = row.entretien?.date_echeance ?? undefined
                  const echeanceDisplay = echeanceStr ? new Date(echeanceStr).toLocaleDateString('fr-FR') : null
                  const isUpdatingThis = updatingEcheance === row.entretien?.id
                  const isCreatingThis = creatingFor === row.profile.id

                  return (
                    <tr key={row.profile.id} className="hover:bg-slate-50/50 transition-colors group">
                      {/* Collaborateur */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <InitialsAvatar name={fullName} className="size-8 text-xs shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{fullName}</p>
                            {row.profile.job_title && (
                              <p className="text-xs text-slate-500 truncate">{row.profile.job_title}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Manager (RH only) */}
                      {userRole === 'hr' && (
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm text-slate-600">{managerName || <span className="text-slate-300">—</span>}</span>
                        </td>
                      )}

                      {/* BU */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {row.profile.bu ? (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {row.profile.bu}
                          </span>
                        ) : <span className="text-slate-300 text-sm">—</span>}
                      </td>

                      {/* Statut — 4 états détaillés */}
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                          cfg.color, cfg.bg, cfg.border
                        )}>
                          <cfg.icon className="size-3.5" />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Mis à jour */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-slate-500">{updatedAt ?? <span className="text-slate-300">—</span>}</span>
                      </td>

                      {/* Échéance */}
                      <td className="px-4 py-3">
                        {row.entretien ? (
                          userRole === 'hr' ? (
                            <div className="flex items-center gap-1">
                              {isUpdatingThis && <Loader2 className="size-3 animate-spin text-[#00b2de]" />}
                            <DatePicker
                                date={row.entretien?.date_echeance ?? undefined}
                                setDate={(dateStr) => handleEcheanceChange(row.entretien!.id, dateStr)}
                                disabled={isUpdatingThis}
                              />
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500">
                              {echeanceDisplay ?? <span className="text-slate-300">—</span>}
                            </span>
                          )
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        {statut === 'non_commence' ? (
                          <button
                            onClick={() => handleCreate(row)}
                            disabled={!!isCreatingThis}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#00b2de] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[#0096c7] transition-colors disabled:opacity-60"
                          >
                            {isCreatingThis ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                            Créer l'EAD
                          </button>
                        ) : statut === 'signe' ? (
                          <button
                            onClick={() => handleOpen(row.entretien!.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <Eye className="size-3" />
                            Consulter
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpen(row.entretien!.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                          >
                            <Pencil className="size-3" />
                            Reprendre
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
