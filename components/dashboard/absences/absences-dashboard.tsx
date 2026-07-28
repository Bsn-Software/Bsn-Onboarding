'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  CalendarOff,
  Loader2,
  Search,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  FileText,
  X,
  Calendar,
  ChevronDown,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getAbsencesDashboard,
  cloturerAbsence,
} from '@/app/actions/absences'
import {
  type AbsenceDashboardRow,
  type NiveauRisque,
  ABSENCE_TYPE_LABELS,
  NIVEAU_RISQUE_LABELS,
} from '@/lib/absences-config'
import { InitialsAvatar } from '@/components/dashboard/shared/initials-avatar'
import { toast } from 'sonner'

// ─────────────────────────────────────────────────────────────
// Config statut
// ─────────────────────────────────────────────────────────────

type AbsenceStatut = 'en_cours' | 'terminee'

function getStatut(row: AbsenceDashboardRow): AbsenceStatut {
  return row.absence.date_fin_reelle ? 'terminee' : 'en_cours'
}

const STATUT_CONFIG: Record<AbsenceStatut, { label: string; color: string; bg: string; border: string; dot: string }> = {
  en_cours:  { label: 'En cours',  color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',  dot: 'bg-amber-500' },
  terminee:  { label: 'Terminée',  color: 'text-slate-600',   bg: 'bg-slate-100',  border: 'border-slate-200',  dot: 'bg-slate-400' },
}

const RISQUE_CONFIG: Record<NiveauRisque, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  aucun:                { label: 'Aucun risque',         color: 'text-slate-500',  bg: 'bg-slate-50',  border: 'border-slate-200', icon: CheckCircle2 },
  remplacant_a_prevoir: { label: 'Remplaçant à prévoir', color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200', icon: AlertTriangle },
  mission_en_danger:    { label: 'Mission en danger',    color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',   icon: ShieldAlert },
}

// ─────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────

function StatCard({ label, count, color, bg, icon: Icon }: {
  label: string; count: number; color: string; bg: string; icon: React.ElementType
}) {
  return (
    <div className={cn('flex items-center gap-4 rounded-xl border p-4 shadow-sm', bg, 'border-transparent')}>
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', color.replace('text-', 'bg-').replace('700', '100').replace('600', '100').replace('500', '100'))}>
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
// Modal de clôture
// ─────────────────────────────────────────────────────────────

function CloturModal({
  row,
  onConfirm,
  onClose,
}: {
  row: AbsenceDashboardRow
  onConfirm: (dateFinReelle: string) => Promise<void>
  onClose: () => void
}) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)
  const fullName = [row.collaborateur.first_name, row.collaborateur.last_name].filter(Boolean).join(' ')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Clôturer l'absence</h3>
          <button onClick={onClose} className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          Renseignez la date de retour réelle de <strong>{fullName}</strong>.
          L'absence sera marquée comme <span className="text-slate-700 font-medium">Terminée</span>.
        </p>

        <div className="space-y-1.5 mb-5">
          <label className="block text-sm font-medium text-slate-700">Date de fin réelle</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={date}
              min={row.absence.date_debut}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-[#00b2de] focus:outline-none focus:ring-2 focus:ring-[#00b2de]/20"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={async () => {
              if (!date) return
              setSubmitting(true)
              await onConfirm(date)
              setSubmitting(false)
            }}
            disabled={submitting || !date}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#00b2de] py-2.5 text-sm font-semibold text-white hover:bg-[#0096c7] transition-colors disabled:opacity-50"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Clôturer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────

export function AbsencesDashboard() {
  const [rows, setRows] = useState<AbsenceDashboardRow[]>([])
  const [userRole, setUserRole] = useState<'hr' | 'manager'>('manager')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtres
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatut, setFilterStatut] = useState<AbsenceStatut | 'tous'>('tous')
  const [filterType, setFilterType] = useState<string>('tous')
  const [filterRisque, setFilterRisque] = useState<NiveauRisque | 'tous'>('tous')
  const [filterManager, setFilterManager] = useState<string>('tous')

  // Clôture
  const [cloturingRow, setCloturingRow] = useState<AbsenceDashboardRow | null>(null)

  const loadDashboard = async () => {
    setLoading(true)
    setError(null)
    const res = await getAbsencesDashboard()
    if (res.error) {
      setError(res.error)
    } else {
      setRows(res.rows)
      setUserRole(res.userRole)
    }
    setLoading(false)
  }

  useEffect(() => { loadDashboard() }, [])

  // ── Compteurs ──────────────────────────────────────────────

  const counts = useMemo(() => ({
    en_cours: rows.filter(r => !r.absence.date_fin_reelle).length,
    missions_risque: rows.filter(r => !r.absence.date_fin_reelle && r.absence.niveau_de_risque !== 'aucun').length,
    sans_certificat: rows.filter(r => !r.absence.date_fin_reelle && r.absence.absences_documents.length === 0).length,
    terminee: rows.filter(r => !!r.absence.date_fin_reelle).length,
  }), [rows])

  // ── Listes pour filtres ────────────────────────────────────

  const managers = useMemo(() => {
    const seen = new Set<string>()
    return rows
      .filter(r => r.collaborateur.manager_id && r.collaborateur.manager_first_name)
      .filter(r => {
        const key = r.collaborateur.manager_id!
        if (seen.has(key)) return false
        seen.add(key); return true
      })
      .map(r => ({
        id: r.collaborateur.manager_id!,
        label: [r.collaborateur.manager_first_name, r.collaborateur.manager_last_name].filter(Boolean).join(' '),
      }))
  }, [rows])

  // ── Filtrage côté client ───────────────────────────────────

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const statut = getStatut(r)
      const fullName = [r.collaborateur.first_name, r.collaborateur.last_name].join(' ').toLowerCase()
      const mission = (r.absence.mission_ou_client_concerne ?? '').toLowerCase()

      if (searchQuery && !fullName.includes(searchQuery.toLowerCase()) && !mission.includes(searchQuery.toLowerCase())) return false
      if (filterStatut !== 'tous' && statut !== filterStatut) return false
      if (filterType !== 'tous' && r.absence.type !== filterType) return false
      if (filterRisque !== 'tous' && r.absence.niveau_de_risque !== filterRisque) return false
      if (filterManager !== 'tous' && r.collaborateur.manager_id !== filterManager) return false
      return true
    })
  }, [rows, searchQuery, filterStatut, filterType, filterRisque, filterManager])

  // ── Clôture ───────────────────────────────────────────────

  const handleCloturer = async (row: AbsenceDashboardRow, dateFinReelle: string) => {
    const res = await cloturerAbsence(row.absence.id, dateFinReelle)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Absence clôturée.')
      setCloturingRow(null)
      // Mise à jour optimiste
      setRows(prev => prev.map(r =>
        r.absence.id === row.absence.id
          ? { ...r, absence: { ...r.absence, date_fin_reelle: dateFinReelle } }
          : r
      ))
    }
  }

  // ── Rendu chargement / erreur ──────────────────────────────

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#00b2de]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
        <AlertTriangle className="size-8 text-amber-500" />
        <p className="text-sm font-medium">{error}</p>
        <button onClick={loadDashboard} className="text-sm text-[#00b2de] hover:underline">Réessayer</button>
      </div>
    )
  }

  // ── Rendu principal ────────────────────────────────────────

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Suivi des absences</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {userRole === 'hr' ? 'Vue RH — tous les collaborateurs' : 'Vue Manager — votre équipe uniquement'}
          </p>
        </div>
        <button
          onClick={loadDashboard}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw className="size-3.5" />
          Actualiser
        </button>
      </div>

      {/* ── Compteurs ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="En cours"
          count={counts.en_cours}
          color="text-amber-700"
          bg="bg-amber-50"
          icon={Clock}
        />
        <StatCard
          label="Missions à risque"
          count={counts.missions_risque}
          color="text-red-700"
          bg="bg-red-50"
          icon={ShieldAlert}
        />
        <StatCard
          label="Certificats manquants"
          count={counts.sans_certificat}
          color="text-orange-700"
          bg="bg-orange-50"
          icon={FileText}
        />
        <StatCard
          label="Terminées"
          count={counts.terminee}
          color="text-slate-600"
          bg="bg-slate-100"
          icon={CheckCircle2}
        />
      </div>

      {/* ── Filtres ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        {/* Recherche */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un collaborateur ou une mission..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#00b2de] focus:outline-none focus:ring-2 focus:ring-[#00b2de]/20 focus:bg-white"
          />
        </div>

        {/* Statut */}
        <div className="relative">
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value as AbsenceStatut | 'tous')}
            className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-[#00b2de] focus:outline-none cursor-pointer"
          >
            <option value="tous">Tous statuts</option>
            <option value="en_cours">En cours</option>
            <option value="terminee">Terminée</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
        </div>

        {/* Type */}
        <div className="relative">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-[#00b2de] focus:outline-none cursor-pointer"
          >
            <option value="tous">Tous types</option>
            {Object.entries(ABSENCE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
        </div>

        {/* Risque */}
        <div className="relative">
          <select
            value={filterRisque}
            onChange={(e) => setFilterRisque(e.target.value as NiveauRisque | 'tous')}
            className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-[#00b2de] focus:outline-none cursor-pointer"
          >
            <option value="tous">Tous niveaux de risque</option>
            {Object.entries(NIVEAU_RISQUE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
        </div>

        {/* Manager (visible RH uniquement) */}
        {userRole === 'hr' && managers.length > 0 && (
          <div className="relative">
            <select
              value={filterManager}
              onChange={(e) => setFilterManager(e.target.value)}
              className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-[#00b2de] focus:outline-none cursor-pointer"
            >
              <option value="tous">Tous les managers</option>
              {managers.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          </div>
        )}

        {/* Reset filtres */}
        {(searchQuery || filterStatut !== 'tous' || filterType !== 'tous' || filterRisque !== 'tous' || filterManager !== 'tous') && (
          <button
            onClick={() => { setSearchQuery(''); setFilterStatut('tous'); setFilterType('tous'); setFilterRisque('tous'); setFilterManager('tous') }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <X className="size-3.5" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* ── Tableau ── */}
      {filteredRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <CalendarOff className="size-10 text-slate-200" />
          <p className="text-sm font-medium text-slate-500">Aucune absence ne correspond aux filtres</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Collaborateur</th>
                  {userRole === 'hr' && (
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Manager</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Période</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Certificat</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Mission / Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Risque</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => {
                  const statut = getStatut(row)
                  const statutCfg = STATUT_CONFIG[statut]
                  const risqueCfg = RISQUE_CONFIG[row.absence.niveau_de_risque]
                  const RisqueIcon = risqueCfg.icon
                  const fullName = [row.collaborateur.first_name, row.collaborateur.last_name].filter(Boolean).join(' ')
                  const managerName = [row.collaborateur.manager_first_name, row.collaborateur.manager_last_name].filter(Boolean).join(' ')
                  const hasCertificat = row.absence.absences_documents.length > 0

                  const dateDebut = new Date(row.absence.date_debut).toLocaleDateString('fr-FR')
                  const dateFinPrevue = row.absence.date_fin_prevue ? new Date(row.absence.date_fin_prevue).toLocaleDateString('fr-FR') : null
                  const dateFinReelle = row.absence.date_fin_reelle ? new Date(row.absence.date_fin_reelle).toLocaleDateString('fr-FR') : null

                  return (
                    <tr key={row.absence.id} className="hover:bg-slate-50/50 transition-colors group">

                      {/* Collaborateur */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <InitialsAvatar name={fullName} className="size-8 text-xs shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{fullName}</p>
                            <p className="text-xs text-slate-500 truncate">{row.collaborateur.job_title || row.collaborateur.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Manager (RH only) */}
                      {userRole === 'hr' && (
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">{managerName || <span className="text-slate-300">—</span>}</span>
                        </td>
                      )}

                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center rounded-lg px-2 py-1 text-xs font-semibold',
                          row.absence.type === 'accident_travail' ? 'bg-red-100 text-red-700' :
                          row.absence.type === 'maladie' ? 'bg-amber-100 text-amber-700' :
                          row.absence.type === 'conge_maternite' ? 'bg-pink-100 text-pink-700' :
                          row.absence.type === 'conge_paternite' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        )}>
                          {ABSENCE_TYPE_LABELS[row.absence.type]}
                        </span>
                      </td>

                      {/* Période */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col text-xs text-slate-600">
                          <span>Depuis le <strong className="text-slate-800">{dateDebut}</strong></span>
                          {dateFinReelle ? (
                            <span className="text-slate-500">Retour le <strong className="text-slate-700">{dateFinReelle}</strong></span>
                          ) : dateFinPrevue ? (
                            <span className="text-slate-400">Fin prévue : {dateFinPrevue}</span>
                          ) : (
                            <span className="text-slate-400 italic">Durée indéterminée</span>
                          )}
                        </div>
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                          statutCfg.color, statutCfg.bg, statutCfg.border
                        )}>
                          <span className={cn('size-1.5 rounded-full shrink-0', statutCfg.dot)} />
                          {statutCfg.label}
                        </span>
                      </td>

                      {/* Certificat */}
                      <td className="px-4 py-3">
                        {hasCertificat ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="size-3" />
                            Fourni
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-2.5 py-1 text-xs font-medium text-orange-700">
                            <Clock className="size-3" />
                            En attente
                          </span>
                        )}
                      </td>

                      {/* Mission / Client */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 max-w-[160px] truncate block">
                          {row.absence.mission_ou_client_concerne || <span className="text-slate-300">—</span>}
                        </span>
                      </td>

                      {/* Niveau de risque */}
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                          risqueCfg.color, risqueCfg.bg, risqueCfg.border
                        )}>
                          <RisqueIcon className="size-3 shrink-0" />
                          {risqueCfg.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        {statut === 'en_cours' && userRole === 'hr' ? (
                          <button
                            onClick={() => setCloturingRow(row)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                          >
                            <CheckCircle2 className="size-3.5" />
                            Clôturer
                          </button>
                        ) : statut === 'terminee' ? (
                          <span className="text-xs text-slate-400 italic">Terminée</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer compteur */}
          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-500">
            {filteredRows.length} absence{filteredRows.length > 1 ? 's' : ''} affichée{filteredRows.length > 1 ? 's' : ''}
            {filteredRows.length !== rows.length && ` (sur ${rows.length} au total)`}
          </div>
        </div>
      )}

      {/* ── Modal clôture ── */}
      {cloturingRow && (
        <CloturModal
          row={cloturingRow}
          onConfirm={(date) => handleCloturer(cloturingRow, date)}
          onClose={() => setCloturingRow(null)}
        />
      )}
    </div>
  )
}
