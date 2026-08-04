'use client'

import { useState, useRef, useCallback } from 'react'
import {
  X, Loader2, UploadCloud, FileText, Calendar,
  AlertTriangle, ShieldAlert, CheckCircle2, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  createAbsence,
  recordCertificatUpload,
} from '@/app/actions/absences'
import {
  type AbsenceType,
  type NiveauRisque,
  ABSENCE_TYPE_LABELS,
  NIVEAU_RISQUE_LABELS,
} from '@/lib/absences-config'
import { toast } from 'sonner'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Props {
  collaborateurId: string
  collaborateurNom?: string  // Affiché uniquement quand c'est le RH qui déclare pour autrui
  onSuccess: () => void
  onClose: () => void
}

// ─────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────

const RISQUE_CONFIG: Record<NiveauRisque, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  aucun:                 { label: 'Aucun risque',          color: 'text-slate-600',   bg: 'bg-slate-50',   border: 'border-slate-200', icon: CheckCircle2 },
  remplacant_a_prevoir:  { label: 'Remplaçant à prévoir',  color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200', icon: AlertTriangle },
  mission_en_danger:     { label: 'Mission en danger',     color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',   icon: ShieldAlert },
}

// ─────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────

export function AbsenceDeclarationForm({ collaborateurId, collaborateurNom, onSuccess, onClose }: Props) {
  const isForOther = !!collaborateurNom

  // Champs du formulaire
  const [type, setType] = useState<AbsenceType>('maladie')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFinPrevue, setDateFinPrevue] = useState('')
  const [missionClient, setMissionClient] = useState('')
  const [niveauRisque, setNiveauRisque] = useState<NiveauRisque>('aucun')
  const [commentaire, setCommentaire] = useState('')

  // Pickers ouverts
  const [openPicker, setOpenPicker] = useState<'debut' | 'fin' | null>(null)

  // Upload certificat
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // États de soumission
  const [submitting, setSubmitting] = useState(false)

  // ── Helpers Date ────────────────────────────────────────────
  const toISO = (d: Date) => d.toISOString().split('T')[0]
  const today = toISO(new Date())

  // ── Gestion du fichier ──────────────────────────────────────
  const handleFileSelect = (file: File) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowed.includes(file.type)) {
      toast.error('Format non supporté. Accepté : PDF, JPG, PNG.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Fichier trop lourd (max 5 Mo).')
      return
    }
    setSelectedFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  // ── Soumission ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dateDebut) { toast.error('La date de début est requise.'); return }
    setSubmitting(true)

    try {
      // 1. Créer l'absence
      const res = await createAbsence({
        collaborateur_id: collaborateurId,
        type,
        date_debut: dateDebut,
        date_fin_prevue: dateFinPrevue || null,
        mission_ou_client_concerne: missionClient || null,
        niveau_de_risque: niveauRisque,
        commentaire: commentaire || null,
      })

      if (res.error) {
        toast.error(res.error)
        setSubmitting(false)
        return
      }

      const absenceId = res.id!

      // 2. Upload du certificat si fourni
      if (selectedFile) {
        const supabase = createClient()
        const fileExt = selectedFile.name.split('.').pop()
        const safeFileName = `${crypto.randomUUID()}.${fileExt}`
        const filePath = `${collaborateurId}/${safeFileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('absences_documents')
          .upload(filePath, selectedFile)

        if (uploadError) {
          console.error('Erreur upload certificat:', uploadError)
          toast.warning('Absence déclarée, mais le certificat n\'a pas pu être envoyé.')
        } else {
          await recordCertificatUpload(absenceId, uploadData.path, selectedFile.name)
        }
      }

      toast.success('Absence déclarée avec succès.')
      onSuccess()
    } catch (err) {
      console.error(err)
      toast.error('Une erreur inattendue est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Rendu ───────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200">
        
        {/* ── En-tête ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Déclarer une absence</h2>
            {isForOther && (
              <p className="text-sm text-slate-500 mt-0.5">
                Pour <span className="font-semibold text-slate-700">{collaborateurNom}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ── Formulaire ── */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Type d'absence */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Type d'absence <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(ABSENCE_TYPE_LABELS) as AbsenceType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-xs font-medium text-left transition-all',
                    type === t
                      ? 'border-[#00b2de] bg-[#00b2de]/10 text-[#00b2de] ring-1 ring-[#00b2de]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  {ABSENCE_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Date de début */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Date de début <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenPicker(openPicker === 'debut' ? null : 'debut')}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all',
                    dateDebut ? 'text-slate-900' : 'text-slate-400',
                    openPicker === 'debut'
                      ? 'border-[#00b2de] ring-2 ring-[#00b2de]/20 bg-white'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  )}
                >
                  <Calendar className="size-4 text-slate-400 shrink-0" />
                  <span className="flex-1 text-left">
                    {dateDebut
                      ? new Date(dateDebut + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                      : 'Choisir une date'}
                  </span>
                  {dateDebut && (
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); setDateDebut(''); setDateFinPrevue('') }}
                      className="flex size-4 items-center justify-center rounded-full text-slate-400 hover:text-slate-700"
                    >
                      <X className="size-3" />
                    </span>
                  )}
                </button>

                {openPicker === 'debut' && (
                  <DatePickerDropdown
                    value={dateDebut}
                    onChange={(d) => { setDateDebut(d); setOpenPicker(null) }}
                    onClose={() => setOpenPicker(null)}
                    today={today}
                  />
                )}
              </div>

              {/* Raccourcis */}
              <div className="flex gap-2">
                {[
                  { label: "Aujourd'hui", value: today },
                  { label: 'Hier', value: toISO(new Date(Date.now() - 86400000)) },
                  { label: 'Il y a 7j', value: toISO(new Date(Date.now() - 7 * 86400000)) },
                ].map(s => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => { setDateDebut(s.value); setOpenPicker(null) }}
                    className={cn(
                      'rounded-lg border px-2.5 py-1 text-xs font-medium transition-all',
                      dateDebut === s.value
                        ? 'border-[#00b2de] bg-[#00b2de]/10 text-[#00b2de]'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date de fin prévue */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Date de fin prévue
                <span className="ml-1 text-xs text-slate-400 font-normal">(optionnel)</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenPicker(openPicker === 'fin' ? null : 'fin')}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all',
                    dateFinPrevue ? 'text-slate-900' : 'text-slate-400',
                    openPicker === 'fin'
                      ? 'border-[#00b2de] ring-2 ring-[#00b2de]/20 bg-white'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  )}
                >
                  <Calendar className="size-4 text-slate-400 shrink-0" />
                  <span className="flex-1 text-left">
                    {dateFinPrevue
                      ? new Date(dateFinPrevue + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                      : 'Choisir une date'}
                  </span>
                  {dateFinPrevue && (
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); setDateFinPrevue('') }}
                      className="flex size-4 items-center justify-center rounded-full text-slate-400 hover:text-slate-700"
                    >
                      <X className="size-3" />
                    </span>
                  )}
                </button>

                {openPicker === 'fin' && (
                  <DatePickerDropdown
                    value={dateFinPrevue}
                    minDate={dateDebut || today}
                    onChange={(d) => { setDateFinPrevue(d); setOpenPicker(null) }}
                    onClose={() => setOpenPicker(null)}
                    today={today}
                  />
                )}
              </div>

              {/* Raccourcis relatifs à la date de début */}
              {dateDebut && (
                <div className="flex gap-2">
                  {[
                    { label: '+7 jours', days: 7 },
                    { label: '+30 jours', days: 30 },
                    { label: '+90 jours', days: 90 },
                  ].map(s => {
                    const v = toISO(new Date(new Date(dateDebut).getTime() + s.days * 86400000))
                    return (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => { setDateFinPrevue(v); setOpenPicker(null) }}
                        className={cn(
                          'rounded-lg border px-2.5 py-1 text-xs font-medium transition-all',
                          dateFinPrevue === v
                            ? 'border-[#00b2de] bg-[#00b2de]/10 text-[#00b2de]'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                        )}
                      >
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Mission / Client */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Mission / Client concerné
              <span className="ml-1 text-xs text-slate-400 font-normal">(optionnel)</span>
            </label>
            <input
              type="text"
              value={missionClient}
              onChange={(e) => setMissionClient(e.target.value)}
              placeholder="Ex. Projet Alpha — Client BSN"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#00b2de] focus:outline-none focus:ring-2 focus:ring-[#00b2de]/20"
            />
          </div>

          {/* Niveau de risque */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Impact sur la mission
              <span className="ml-1 text-xs text-slate-400 font-normal">(optionnel)</span>
            </label>
            <div className="flex flex-col gap-2">
              {(Object.keys(RISQUE_CONFIG) as NiveauRisque[]).map((r) => {
                const cfg = RISQUE_CONFIG[r]
                const Icon = cfg.icon
                const selected = niveauRisque === r
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setNiveauRisque(r)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm text-left transition-all',
                      selected
                        ? `${cfg.bg} ${cfg.border} ${cfg.color} ring-1 ring-offset-0`
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                    style={undefined}
                  >
                    <Icon className={cn('size-4 shrink-0', selected ? cfg.color : 'text-slate-400')} />
                    <span className={cn('font-medium', selected ? cfg.color : '')}>{cfg.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Commentaire */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Commentaire
              <span className="ml-1 text-xs text-slate-400 font-normal">(optionnel)</span>
            </label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={3}
              placeholder="Informations complémentaires..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#00b2de] focus:outline-none focus:ring-2 focus:ring-[#00b2de]/20"
            />
          </div>

          {/* Upload certificat */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Certificat médical / justificatif
              <span className="ml-1 text-xs text-slate-400 font-normal">(optionnel, peut être ajouté après coup)</span>
            </label>

            {selectedFile ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="size-5 text-emerald-600 shrink-0" />
                  <span className="text-sm font-medium text-emerald-700 truncate">{selectedFile.name}</span>
                  <span className="text-xs text-emerald-600 shrink-0">
                    ({(selectedFile.size / 1024 / 1024).toFixed(1)} Mo)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="ml-3 flex size-6 shrink-0 items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-100 transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <div
                className={cn(
                  'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 px-4 text-center transition-all cursor-pointer',
                  isDragging
                    ? 'border-[#00b2de] bg-[#00b2de]/5'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className={cn('size-8', isDragging ? 'text-[#00b2de]' : 'text-slate-300')} />
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    Glisser-déposer ou <span className="text-[#00b2de]">choisir un fichier</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">PDF, JPG, PNG — max 5 Mo</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]) }}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || !dateDebut}
              className="inline-flex items-center gap-2 rounded-xl bg-[#00b2de] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0096c7] transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Déclarer l'absence
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DatePickerDropdown — calendrier inline
// ─────────────────────────────────────────────────────────────

const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]
const DAYS_FR = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']

function DatePickerDropdown({
  value,
  onChange,
  onClose,
  today,
  minDate,
}: {
  value: string
  onChange: (v: string) => void
  onClose: () => void
  today: string
  minDate?: string
}) {
  const initDate = value ? new Date(value + 'T00:00:00') : new Date()
  const [viewYear, setViewYear] = useState(initDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initDate.getMonth())

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // Calcul des jours du mois à afficher
  const firstDay = new Date(viewYear, viewMonth, 1)
  // Lundi = 0, ..., Dimanche = 6
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  const toISO = (d: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    return `${viewYear}-${mm}-${dd}`
  }

  return (
    <div
      className="absolute left-0 top-full z-50 mt-1 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"
      onMouseDown={(e) => e.preventDefault()} // Empêche blur sur le bouton parent
    >
      {/* Navigation mois */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} className="flex size-7 items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronLeft className="size-4 text-slate-600" />
        </button>
        <span className="text-sm font-semibold text-slate-800">
          {MONTHS_FR[viewMonth]} {viewYear}
        </span>
        <button type="button" onClick={nextMonth} className="flex size-7 items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronRight className="size-4 text-slate-600" />
        </button>
      </div>

      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_FR.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold uppercase text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Grille de dates */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const iso = toISO(day)
          const isSelected = iso === value
          const isToday = iso === today
          const disabled = !!minDate && iso < minDate
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onChange(iso)}
              className={cn(
                'flex size-8 mx-auto items-center justify-center rounded-lg text-sm transition-all',
                disabled && 'opacity-30 cursor-not-allowed',
                isSelected && 'bg-[#00b2de] text-white font-semibold shadow-sm',
                !isSelected && isToday && 'border border-[#00b2de] text-[#00b2de] font-semibold',
                !isSelected && !isToday && !disabled && 'text-slate-700 hover:bg-slate-100',
              )}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Raccourci Aujourd'hui */}
      <div className="mt-2 border-t border-slate-100 pt-2">
        <button
          type="button"
          onClick={() => onChange(today)}
          className="w-full rounded-lg py-1.5 text-xs font-medium text-[#00b2de] hover:bg-[#00b2de]/5 transition-colors"
        >
          Aujourd'hui
        </button>
      </div>
    </div>
  )
}
