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
import { getEntretiensByCollaborator, createEntretien } from '@/app/actions/ead'
import { EadView } from '../ead/ead-view'

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
  
  const [activeTab, setActiveTab] = useState<'timeline' | 'ead'>('timeline')
  const [eadList, setEadList] = useState<any[]>([])
  const [loadingEad, setLoadingEad] = useState(false)
  const [selectedEadId, setSelectedEadId] = useState<string | null>(null)

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

  const loadEadList = async (collaboratorId: string) => {
    setLoadingEad(true)
    const res = await getEntretiensByCollaborator(collaboratorId)
    if (res.data) setEadList(res.data)
    setLoadingEad(false)
  }

  useEffect(() => {
    if (data?.collaborator?.id && activeTab === 'ead') {
      loadEadList(data.collaborator.id)
    }
  }, [activeTab, data])

  const handleCreateEad = async () => {
    const currentYear = new Date().getFullYear()
    const res = await createEntretien(data.collaborator.id, currentYear)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Entretien initialisé avec succès !")
      loadEadList(data.collaborator.id)
      setSelectedEadId(res.id)
    }
  }

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

  if (selectedEadId) {
    return (
      <div className="flex flex-col h-full w-full max-w-5xl mx-auto overflow-y-auto scrollbar-hide">
        <EadView 
          entretienId={selectedEadId} 
          onBack={() => { 
            setSelectedEadId(null)
            if (data?.collaborator?.id) loadEadList(data.collaborator.id)
          }} 
        />
      </div>
    )
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

      {/* ── Navigation Onglets ── */}
      <div className="flex items-center gap-6 border-b border-slate-200 mt-6 shrink-0">
        <button
          onClick={() => setActiveTab('timeline')}
          className={cn(
            "pb-3 text-sm font-medium transition-colors relative",
            activeTab === 'timeline' ? "text-[#00b2de]" : "text-slate-500 hover:text-slate-800"
          )}
        >
          Parcours Onboarding
          {activeTab === 'timeline' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#00b2de] rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('ead')}
          className={cn(
            "pb-3 text-sm font-medium transition-colors relative",
            activeTab === 'ead' ? "text-[#00b2de]" : "text-slate-500 hover:text-slate-800"
          )}
        >
          Entretiens EAD
          {activeTab === 'ead' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#00b2de] rounded-t-full" />
          )}
        </button>
      </div>

      {activeTab === 'timeline' && (
        <TimelineSCurve data={data} onToggleItem={handleToggle} onRefresh={loadTimeline} />
      )}

      {activeTab === 'ead' && (
        <div className="flex-1 flex flex-col pt-6 overflow-y-auto scrollbar-hide">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Historique des entretiens</h2>
            <button
              onClick={handleCreateEad}
              className="flex items-center gap-2 rounded-lg bg-[#00b2de] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#009bc2] transition-colors"
            >
              <FileBadge className="size-4" />
              Nouvel Entretien ({new Date().getFullYear()})
            </button>
          </div>

          {loadingEad ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="size-6 animate-spin text-slate-300" />
            </div>
          ) : eadList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
              <FileBadge className="size-10 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-900">Aucun entretien enregistré</p>
              <p className="text-xs text-slate-500 mt-1">L'historique des entretiens de ce collaborateur apparaîtra ici.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {eadList.map(ead => (
                <div 
                  key={ead.id}
                  onClick={() => setSelectedEadId(ead.id)}
                  className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[#00b2de]/50 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Calendar className="size-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">EAD {ead.annee}</h3>
                        <p className="text-xs text-slate-500">
                          Mis à jour : {new Date(ead.updated_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border",
                      ead.statut === 'signe' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      ead.statut === 'soumis' ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-slate-50 text-slate-700 border-slate-200"
                    )}>
                      {ead.statut === 'signe' ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5" />}
                      {ead.statut === 'signe' ? 'Clôturé et signé' : ead.statut === 'soumis' ? 'En cours de validation' : 'Brouillon'}
                    </span>
                    <span className="text-xs font-medium text-[#00b2de] group-hover:underline">
                      Ouvrir &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
