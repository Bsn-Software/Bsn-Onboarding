'use client'

import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Building2,
  Mail,
  Calendar,
  X,
  FileBadge,
  ShieldCheck,
  Laptop,
  MessageSquare,
  Stethoscope,
  FolderOpen,
  Send,
  RefreshCw,
  UserMinus
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { InitialsAvatar } from '../shared/initials-avatar'
import { getCollaboratorTimeline, toggleChecklistItem, initiateOffboarding } from '@/app/actions/checklist'
import { sendInvitation } from '@/app/actions/collaborators'
import { TimelineSCurve } from './timeline-s-curve'
import { toast } from 'sonner'

export function CollaboratorDetailView({
  checklistId,
  onBack
}: {
  checklistId: string
  onBack: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [selectedStep, setSelectedStep] = useState<any>(null)
  const [isInviting, setIsInviting] = useState(false)
  const [isOffboarding, setIsOffboarding] = useState(false)
  const [showOffboardModal, setShowOffboardModal] = useState(false)
  const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0])

  const handleInitiateOffboarding = () => {
    setShowOffboardModal(true)
  }

  const submitOffboarding = async () => {
    if (!data?.collaborator?.id) return

    setIsOffboarding(true)
    const res = await initiateOffboarding(data.collaborator.id, exitDate || undefined)
    setIsOffboarding(false)
    setShowOffboardModal(false)
    
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Suivi de sortie initié avec succès !")
      onBack()
    }
  }

  const loadTimeline = () => {
    getCollaboratorTimeline(checklistId)
      .then(res => {
        setData(res)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadTimeline()
  }, [checklistId])

  const handleToggle = async (itemId: string, currentDone: boolean) => {
    try {
      await toggleChecklistItem(checklistId, itemId, !currentDone)
      loadTimeline() // Recharge pour mettre à jour la jauge globale et la timeline
    } catch (err) {
      console.error(err)
      toast.error("Impossible de mettre à jour la tâche.")
      loadTimeline() // Rollback en cas d'erreur
    }
  }

  const handleResendInvite = async () => {
    setIsInviting(true)
    const res = await sendInvitation(data.collaborator.id)
    setIsInviting(false)
    if (res?.error) {
      toast.error(`Erreur : ${res.error}`)
    } else {
      toast.success('Invitation envoyée avec succès !')
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-slate-300" />
      </div>
    )
  }

  if (!data) return null

  const collab = data.collaborator
  const fullName = [collab.first_name, collab.last_name].filter(Boolean).join(' ') || collab.email

  const getGridPosition = (index: number) => {
    switch (index) {
      case 0: return "md:col-start-1 md:row-start-1"
      case 1: return "md:col-start-2 md:row-start-1"
      case 2: return "md:col-start-3 md:row-start-1"
      case 3: return "md:col-start-3 md:row-start-2"
      case 4: return "md:col-start-2 md:row-start-2"
      case 5: return "md:col-start-1 md:row-start-2"
      default: return ""
    }
  }

  return (
    <div className="flex flex-col h-full w-full max-w-6xl mx-auto overflow-hidden">
      {/* ── En-tête (Retour + Profil) compact ── */}
      <div className="flex flex-col gap-3 shrink-0">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 w-fit text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Retour au tableau
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-white p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <InitialsAvatar name={fullName} className="size-12 text-lg" />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{fullName}</h1>
              <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500 mt-1">
                <span className="font-medium text-slate-700">{collab.job_title || 'Nouveau collaborateur'}</span>
                <span className="flex items-center gap-1"><Mail className="size-3" /> {collab.email}</span>
                {collab.entry_date && (
                  <span className="flex items-center gap-1"><Calendar className="size-3" /> {new Date(collab.entry_date).toLocaleDateString('fr-FR')}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {collab.email && !collab.email.startsWith('temp_') && (
              <button
                onClick={handleResendInvite}
                disabled={isInviting}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                {isInviting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 text-[#00b2de]" />}
                <span className="hidden sm:inline">Renvoyer l'invitation</span>
              </button>
            )}

            {data.phase === 'entry' && (
              <button
                onClick={handleInitiateOffboarding}
                disabled={isOffboarding}
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                {isOffboarding ? <Loader2 className="size-4 animate-spin" /> : <UserMinus className="size-4" />}
                <span className="hidden sm:inline">Déclarer le départ</span>
              </button>
            )}

            <button
              onClick={loadTimeline}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
              title="Rafraîchir les données"
            >
              <RefreshCw className="size-4" />
            </button>

            <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-2 border border-slate-100">
              <div className="flex flex-col items-end">
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Avancement</span>
                <span className="text-xl font-bold text-[#00b2de] tabular-nums leading-none">{data.progress}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TimelineSCurve data={data} onToggleItem={handleToggle} onRefresh={loadTimeline} />

      {/* Modal Date de départ */}
      {showOffboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Déclarer le départ</h3>
            <p className="text-sm text-slate-500 mb-4">
              Veuillez indiquer la date de départ prévue pour générer la checklist de sortie.
            </p>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Date de départ</label>
                <div className="relative">
                  <input
                    type="date"
                    value={exitDate}
                    onChange={(e) => setExitDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#00b2de] focus:outline-none focus:ring-1 focus:ring-[#00b2de]"
                    onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                  />
                  <Calendar className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowOffboardModal(false)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  disabled={isOffboarding}
                >
                  Annuler
                </button>
                <button
                  onClick={submitOffboarding}
                  disabled={isOffboarding || !exitDate}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isOffboarding && <Loader2 className="size-4 animate-spin" />}
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
