'use client'

import { useEffect, useState, useRef } from 'react'
import {
  CheckCircle2,
  Clock,
  FileText,
  UploadCloud,
  Loader2,
  AlertCircle,
  LogOut,
  Map,
  FileBox,
  Check,
  Layers,
  X,
  Calendar,
  ArrowLeft,
  FileBadge
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { InitialsAvatar } from '../shared/initials-avatar'
import { createClient } from '@/lib/supabase/client'
import { 
  getCollaboratorDocuments,
  recordDocumentUpload, 
  type DocumentStatus 
} from '@/app/actions/documents'
import { getEntretiensByCollaborator, getManagerTeam, createEntretien } from '@/app/actions/ead'
import { EadView } from '../ead/ead-view'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// ─────────────────────────────────────────────────────────────
// Labels lisibles par catégorie
// ─────────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  administrative: { label: 'Administratif',  color: 'text-violet-700', bg: 'bg-violet-100' },
  documents:      { label: 'Documents',      color: 'text-amber-700', bg: 'bg-amber-100' },
  health:         { label: 'Santé',          color: 'text-emerald-700', bg: 'bg-emerald-100' },
  it:             { label: 'IT',             color: 'text-blue-700', bg: 'bg-blue-100' },
  communication:  { label: 'Communication',  color: 'text-pink-700', bg: 'bg-pink-100' },
  compliance:     { label: 'Conformité',     color: 'text-slate-700', bg: 'bg-slate-100' },
}
const CATEGORIES = Object.keys(CATEGORY_META)

export function CollaboratorView({ onBack, user }: { onBack?: () => void, user?: { name: string } }) {
  const router = useRouter()
  const [documents, setDocuments] = useState<DocumentStatus[]>([])
  const [checklistId, setChecklistId] = useState<string | null>(null)
  const [entryDate, setEntryDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeUploadType, setActiveUploadType] = useState<string | null>(null)

  // ── Navigation et EAD ──
  const [activeTab, setActiveTab] = useState<'onboarding' | 'mes_ead' | 'equipe_ead'>('onboarding')
  const [myEads, setMyEads] = useState<any[]>([])
  const [team, setTeam] = useState<any[]>([])
  const [teamEads, setTeamEads] = useState<Record<string, any[]>>({})
  const [selectedEadId, setSelectedEadId] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const docRes = await getCollaboratorDocuments()
      setChecklistId(docRes.checklistId)
      setDocuments(docRes.documents)
      if (docRes.entryDate) setEntryDate(docRes.entryDate)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Charger mes EAD
        const eadRes = await getEntretiensByCollaborator(user.id)
        if (eadRes.data) setMyEads(eadRes.data)

        // Charger mon équipe si je suis manager
        const teamRes = await getManagerTeam()
        if (teamRes.data && teamRes.data.length > 0) {
          setTeam(teamRes.data)
          // Charger les EAD de l'équipe
          const teamEadsMap: Record<string, any[]> = {}
          for (const member of teamRes.data) {
            const mRes = await getEntretiensByCollaborator(member.id)
            if (mRes.data) teamEadsMap[member.id] = mRes.data
          }
          setTeamEads(teamEadsMap)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeamEad = async (memberId: string) => {
    const res = await createEntretien(memberId, new Date().getFullYear())
    if (res.error) toast.error(res.error)
    else {
      toast.success("Entretien créé")
      loadData()
      setSelectedEadId(res.id)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // ─────────────────────────────────────────────────────────────
  // Gestion de l'upload
  // ─────────────────────────────────────────────────────────────
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [expirationDate, setExpirationDate] = useState<string>('')

  const handleUploadClick = (type: string) => {
    setActiveUploadType(type)
    setSelectedFile(null)
    setExpirationDate('')
    setShowUploadModal(true)
  }

  const confirmUpload = async () => {
    const file = selectedFile
    const type = activeUploadType
    if (!file || !type || !checklistId) return

    setUploading(type)
    setShowUploadModal(false)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setUploading(null)
      return
    }

    const fileExt = file.name.split('.').pop()
    const safeFileName = `${crypto.randomUUID()}.${fileExt}`
    const filePath = `${user.id}/${safeFileName}`

    const { data, error: uploadError } = await supabase.storage
      .from('onboarding_documents')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Erreur upload:', uploadError)
      alert("Erreur lors de l'envoi du fichier.")
      setUploading(null)
      return
    }

    const result = await recordDocumentUpload(
      checklistId, 
      type, 
      file.name, 
      data.path,
      expirationDate ? expirationDate : null
    )
    
    if (result.error) {
      alert("Fichier envoyé, mais erreur lors de l'enregistrement.")
    } else {
      loadData()
    }
    
    setUploading(null)
    setActiveUploadType(null)
  }

  // File input is now used just to set the selected file in the modal
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ─────────────────────────────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────────────────────────────
  const renderDocumentCard = (doc: DocumentStatus, onUploadClick: (type: string) => void, uploadingType: string | null, isGrouped: boolean = false) => {
    const label = doc.label || doc.type
    const hint = doc.hint || ''
    const isPending = doc.status === 'pending'
    const isValidated = doc.status === 'validated'
    const isRejected = doc.status === 'rejected'

    return (
      <li
        key={doc.type}
        className={cn(
          "flex flex-col gap-3 p-4 transition-all hover:bg-slate-50",
          !isGrouped && "rounded-xl border border-slate-200 bg-white shadow-sm hover:border-[#00b2de]/30"
        )}
      >
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              isValidated ? "bg-emerald-100 text-emerald-600" :
              isPending ? "bg-[#00b2de]/10 text-[#00b2de]" :
              isRejected ? "bg-red-100 text-red-600" :
              "bg-slate-100 text-slate-400"
            )}
          >
            {isValidated ? <CheckCircle2 className="size-5" /> : <FileText className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
              {label}
              {isRejected && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600">Refusé</span>}
            </p>
            <p className="truncate text-xs text-slate-500 mt-0.5">
              {hint}
            </p>
            {doc.expiration_date && (
              <p className="flex items-center gap-1.5 text-xs text-orange-600 font-medium mt-1.5">
                <Calendar className="size-3.5" />
                Expire le : {new Date(doc.expiration_date).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
          
          {isValidated ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600 border border-emerald-100">
              Validé
            </span>
          ) : isPending ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 border border-slate-200">
              <Clock className="size-3.5" />
              Vérification
            </span>
          ) : (
            <button
              type="button"
              disabled={uploadingType === doc.type}
              onClick={() => onUploadClick(doc.type)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                isRejected 
                  ? "bg-red-500 hover:bg-red-600 focus-visible:ring-red-500" 
                  : "bg-[#00b2de] hover:bg-[#0096c7] focus-visible:ring-[#00b2de]"
              )}
            >
              {uploadingType === doc.type ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <UploadCloud className="size-3.5" />
              )}
              {isRejected ? 'Remplacer' : 'Déposer'}
            </button>
          )}
        </div>
        
        {isRejected && doc.rejection_reason && (
          <div className="ml-14 mt-1 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-100">
            <span className="font-semibold block mb-1">Motif du refus :</span>
            {doc.rejection_reason}
          </div>
        )}
      </li>
    )
  }

  const completedDocs = documents.filter((doc) => doc.status === 'validated' || doc.status === 'pending').length
  const totalDocs = documents.length
  const progressDocs = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0

  if (selectedEadId) {
    return (
      <div className="flex h-svh w-full flex-col bg-slate-50 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center border-b border-slate-200 bg-white px-4 shadow-sm">
          <button onClick={() => { setSelectedEadId(null); loadData(); }} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="size-4" /> Retour
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">
          <EadView entretienId={selectedEadId} onBack={() => { setSelectedEadId(null); loadData(); }} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileChange}
      />

      {/* HEADER */}
      <header className="flex h-22 shrink-0 items-center justify-between border-b border-[#0096c7] bg-[#00b2de] px-4 sm:px-6 shadow-sm">
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex size-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          </div>
          <div className="border-l border-white/20 pl-4">
            <img src="/logo-white.png" alt="BSN Logo" className="h-12 sm:h-17 w-auto object-contain hover:scale-105 transition-transform duration-300" />
          </div>
          <div className="hidden md:block w-px h-6 bg-white/20 mx-2" aria-hidden="true" />
          <span className="hidden md:inline text-white/90 font-medium">Espace Collaborateur</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-white">{user?.name || "Collaborateur"}</span>
              <span className="text-xs text-white/70">
                {entryDate 
                  ? `Arrivée le ${new Date(entryDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
                  : 'Onboarding'}
              </span>
            </div>
            <InitialsAvatar name={user?.name || "Collaborateur"} />
            <button
              type="button"
              onClick={async () => {
                const supabase = createClient()
                await supabase.auth.signOut()
                router.push('/login')
              }}
              className="text-white/70 transition hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-white rounded-lg p-1.5 hover:bg-white/10 ml-2"
              title="Se déconnecter"
            >
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-slate-300" />
          </div>
        ) : !checklistId ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
            <AlertCircle className="size-10 text-amber-500" />
            <h2 className="text-lg font-medium text-slate-900">Dossier introuvable</h2>
            <p className="text-sm text-center">Aucun dossier d'intégration n'a été créé pour vous. Veuillez contacter les Ressources Humaines.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 mb-8">
              <h1 className="text-2xl font-semibold text-slate-900 text-balance">
                Bienvenue, {user?.name?.split(' ')[0] || "nouveau collaborateur"}.
              </h1>
              <p className="text-sm leading-relaxed text-slate-500 text-pretty max-w-xl">
                Gérez ici votre dossier d'intégration et vos entretiens annuels.
              </p>
            </div>

            {/* ── Navigation Onglets ── */}
            <div className="flex items-center gap-6 border-b border-slate-200 mb-8 overflow-x-auto shrink-0">
              <button
                onClick={() => setActiveTab('onboarding')}
                className={cn(
                  "pb-3 text-sm font-medium transition-colors relative whitespace-nowrap",
                  activeTab === 'onboarding' ? "text-[#00b2de]" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Mon dossier d'intégration
                {activeTab === 'onboarding' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#00b2de] rounded-t-full" />}
              </button>
              <button
                onClick={() => setActiveTab('mes_ead')}
                className={cn(
                  "pb-3 text-sm font-medium transition-colors relative whitespace-nowrap",
                  activeTab === 'mes_ead' ? "text-[#00b2de]" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Mes Entretiens EAD
                {activeTab === 'mes_ead' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#00b2de] rounded-t-full" />}
              </button>
              {team.length > 0 && (
                <button
                  onClick={() => setActiveTab('equipe_ead')}
                  className={cn(
                    "pb-3 text-sm font-medium transition-colors relative whitespace-nowrap flex items-center gap-2",
                    activeTab === 'equipe_ead' ? "text-[#00b2de]" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Mon Équipe (Manager)
                  <span className="rounded-full bg-[#00b2de]/10 px-2 py-0.5 text-xs text-[#00b2de]">{team.length}</span>
                  {activeTab === 'equipe_ead' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#00b2de] rounded-t-full" />}
                </button>
              )}
            </div>

            {activeTab === 'onboarding' && (
              <>
                {/* PROGRESS BAR GLOBAL */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-900">
                  Progression de vos documents
                </span>
                <span className="text-slate-500">
                  {completedDocs}/{totalDocs} documents fournis
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#00a0d1] to-[#00b2de] transition-all duration-500"
                  style={{ width: `${progressDocs}%` }}
                />
              </div>
            </div>

            {/* SECTIONS CATEGORIES */}
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {CATEGORIES.map(cat => {
                const catDocs = documents.filter(d => d.category === cat)
                if (catDocs.length === 0) return null

                const meta = CATEGORY_META[cat] || { label: cat, color: 'text-slate-700', bg: 'bg-slate-100' }
                
                // Groupement par groupe conditionnel
                type Block = { type: 'item', doc: DocumentStatus } | { type: 'group', label: string, items: DocumentStatus[] }
                const blocks: Block[] = []
                let currentGroupLabel: string | null = null
                let currentGroupItems: DocumentStatus[] = []

                catDocs.forEach(doc => {
                  if (doc.is_conditional === true && doc.condition_label && doc.condition_label.trim() !== '') {
                    if (doc.condition_label !== currentGroupLabel) {
                      if (currentGroupLabel) blocks.push({ type: 'group', label: currentGroupLabel, items: currentGroupItems })
                      currentGroupLabel = doc.condition_label
                      currentGroupItems = [doc]
                    } else {
                      currentGroupItems.push(doc)
                    }
                  } else {
                    if (currentGroupLabel) {
                      blocks.push({ type: 'group', label: currentGroupLabel, items: currentGroupItems })
                      currentGroupLabel = null
                      currentGroupItems = []
                    }
                    blocks.push({ type: 'item', doc })
                  }
                })
                if (currentGroupLabel) blocks.push({ type: 'group', label: currentGroupLabel, items: currentGroupItems })

                return (
                  <div key={cat} className="space-y-4">
                    {/* Header de catégorie */}
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                      <span className={cn("px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider", meta.bg, meta.color)}>
                        {meta.label}
                      </span>
                    </div>

                    <ul className="flex flex-col gap-3">
                      {blocks.map((block, bIdx) => {
                        if (block.type === 'item') {
                          return renderDocumentCard(block.doc, handleUploadClick, uploading)
                        } else {
                          const groupLabel = block.label
                          return (
                            <div key={`group-${groupLabel}-${bIdx}`} className="rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm overflow-hidden">
                              <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-100">
                                <Layers className="size-4 text-slate-400" />
                                <span className="text-sm font-semibold text-slate-700">{groupLabel}</span>
                              </div>
                              <ul className="flex flex-col divide-y divide-slate-100 bg-white">
                                {block.items.map(doc => renderDocumentCard(doc, handleUploadClick, uploading, true))}
                              </ul>
                            </div>
                          )
                        }
                      })}
                    </ul>
                  </div>
                )
              })}
            </div>
            
                <p className="mt-8 flex justify-center text-xs text-slate-400 text-center max-w-sm mx-auto">
                  Vos données sont stockées de manière sécurisée et ne sont accessibles que par le département des Ressources Humaines de BSN Engineering.
                </p>
              </>
            )}

            {activeTab === 'mes_ead' && (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="rounded-xl border border-[#00b2de]/20 bg-[#00b2de]/5 p-5 mb-4">
                  <h3 className="font-semibold text-slate-900">Mes Entretiens Annuels</h3>
                  <p className="text-sm text-slate-600 mt-1">Retrouvez ici l'historique de vos EAD. Vous pourrez les remplir une fois initialisés par votre manager ou les RH.</p>
                </div>
                
                {myEads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-xl bg-white">
                    <FileBadge className="size-10 text-slate-300 mb-3" />
                    <p className="text-sm font-medium text-slate-900">Aucun entretien pour le moment</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {myEads.map(ead => (
                      <div key={ead.id} onClick={() => setSelectedEadId(ead.id)} className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[#00b2de]/50 hover:shadow-md">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <Calendar className="size-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900">EAD {ead.annee}</h4>
                            <p className="text-xs text-slate-500">Mis à jour le {new Date(ead.updated_at).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border",
                            ead.statut === 'signe' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            ead.statut === 'soumis' ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-slate-50 text-slate-700 border-slate-200"
                          )}>
                            {ead.statut === 'signe' ? 'Clôturé' : 'En cours'}
                          </span>
                          <span className="text-xs font-medium text-[#00b2de] group-hover:underline">Ouvrir &rarr;</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'equipe_ead' && team.length > 0 && (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-50 p-5">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Layers className="size-5 text-emerald-600" />
                    Espace Manager
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">Vous pouvez consulter, modifier et signer les entretiens des membres de votre équipe.</p>
                </div>

                <div className="flex flex-col gap-4">
                  {team.map(member => {
                    const eads = teamEads[member.id] || []
                    return (
                      <div key={member.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between bg-slate-50 p-4 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <InitialsAvatar name={`${member.first_name} ${member.last_name}`} className="size-8 text-xs" />
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">{member.first_name} {member.last_name}</p>
                              <p className="text-xs text-slate-500">{member.job_title || 'Collaborateur'}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCreateTeamEad(member.id)}
                            className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                          >
                            + Créer EAD {new Date().getFullYear()}
                          </button>
                        </div>
                        <div className="p-4 bg-white">
                          {eads.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">Aucun entretien pour ce collaborateur.</p>
                          ) : (
                            <div className="flex flex-wrap gap-3">
                              {eads.map(ead => (
                                <button
                                  key={ead.id}
                                  onClick={() => setSelectedEadId(ead.id)}
                                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 hover:border-[#00b2de] hover:bg-blue-50/50 transition-colors"
                                >
                                  <FileBadge className="size-4 text-[#00b2de]" />
                                  <div className="flex flex-col items-start text-left">
                                    <span className="text-sm font-medium text-slate-900">Année {ead.annee}</span>
                                    <span className="text-[10px] text-slate-500">{ead.statut === 'signe' ? 'Clôturé' : 'En cours'}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Ajouter un document</h3>
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="size-5" />
                </button>
              </div>
              
              <div className="p-5 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Fichier</label>
                  <div 
                    className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {selectedFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="size-8 text-[#00b2de]" />
                        <span className="text-sm font-medium text-slate-700">{selectedFile.name}</span>
                        <span className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-500">
                        <UploadCloud className="size-8 text-slate-400" />
                        <span className="text-sm">Cliquez pour sélectionner un fichier</span>
                        <span className="text-xs text-slate-400">PDF, JPG, PNG acceptés</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Date d'expiration <span className="text-slate-400 font-normal">(Facultatif)</span>
                  </label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      onClick={(e) => {
                        if ('showPicker' in HTMLInputElement.prototype) {
                          try {
                            e.currentTarget.showPicker()
                          } catch (err) {}
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#00b2de] focus:ring-2 focus:ring-[#00b2de]/20 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">Renseignez la date de fin de validité si ce document expire (ex: pièce d'identité).</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmUpload}
                  disabled={!selectedFile || !!uploading}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#00b2de] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0096c7] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  {uploading ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
