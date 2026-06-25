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
  Check
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { getCollaboratorTimeline } from '@/app/actions/checklist'
import { InitialsAvatar } from '../shared/initials-avatar'
import { createClient } from '@/lib/supabase/client'
import { 
  getCollaboratorDocuments, 
  recordDocumentUpload, 
  type DocumentStatus 
} from '@/app/actions/documents'
import { useRouter } from 'next/navigation'
import { CATEGORY_COLORS } from '../hr/timeline-s-curve'

export function CollaboratorView({ onBack, user }: { onBack?: () => void, user?: { name: string } }) {
  const router = useRouter()
  const [documents, setDocuments] = useState<DocumentStatus[]>([])
  const [timeline, setTimeline] = useState<any[]>([])
  const [checklistId, setChecklistId] = useState<string | null>(null)
  const [checklistData, setChecklistData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeUploadType, setActiveUploadType] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'documents' | 'timeline'>('documents')

  const loadData = async () => {
    setLoading(true)
    try {
      const docRes = await getCollaboratorDocuments()
      setChecklistId(docRes.checklistId)
      setDocuments(docRes.documents)
      
      if (docRes.checklistId) {
        const tlRes = await getCollaboratorTimeline(docRes.checklistId, true)
        if (tlRes.timeline) {
          setTimeline(tlRes.timeline)
          setChecklistData(tlRes.checklist)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // ─────────────────────────────────────────────────────────────
  // Gestion de l'upload
  // ─────────────────────────────────────────────────────────────
  const handleUploadClick = (type: string) => {
    setActiveUploadType(type)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const type = activeUploadType
    if (!file || !type || !checklistId) return

    setUploading(type)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

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

    const result = await recordDocumentUpload(checklistId, type, file.name, data.path)
    
    if (result.error) {
      alert("Fichier envoyé, mais erreur lors de l'enregistrement.")
    } else {
      loadData()
    }
    
    setUploading(null)
    setActiveUploadType(null)
    
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ─────────────────────────────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────────────────────────────
  const completedDocs = documents.filter((doc) => doc.status === 'validated' || doc.status === 'pending').length
  const totalDocs = documents.length
  const progressDocs = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0

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
                {checklistData?.entry_date 
                  ? `Arrivée le ${new Date(checklistData.entry_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
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
                Suivez ici l'avancement de votre intégration chez BSN Engineering. 
                Complétez votre dossier et découvrez les grandes étapes de votre arrivée !
              </p>
            </div>

            {/* TABS */}
            <div className="flex border-b border-slate-200 mb-6">
              <button
                onClick={() => setActiveTab('documents')}
                className={cn(
                  "flex items-center gap-2 pb-3 px-4 text-sm font-medium transition-colors border-b-2 outline-none",
                  activeTab === 'documents' 
                    ? "border-[#00b2de] text-[#00b2de]" 
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                )}
              >
                <FileBox className="size-4" />
                Mes Documents
                {progressDocs < 100 && (
                  <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                    {totalDocs - completedDocs}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={cn(
                  "flex items-center gap-2 pb-3 px-4 text-sm font-medium transition-colors border-b-2 outline-none",
                  activeTab === 'timeline' 
                    ? "border-[#00b2de] text-[#00b2de]" 
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                )}
              >
                <Map className="size-4" />
                Mon Parcours
              </button>
            </div>

            {/* TAB CONTENT: DOCUMENTS */}
            {activeTab === 'documents' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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

                <ul className="mt-6 flex flex-col gap-3">
                  {documents.map((doc) => {
                    const label = doc.label || doc.type
                    const hint = doc.hint || ''
                    const isPending = doc.status === 'pending'
                    const isValidated = doc.status === 'validated'
                    const isRejected = doc.status === 'rejected'

                    return (
                      <li
                        key={doc.type}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-[#00b2de]/30"
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
                          </div>
                          
                          {isValidated ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600 border border-emerald-100">
                              Validé par les RH
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 border border-slate-200">
                              <Clock className="size-3.5" />
                              En vérification
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={uploading === doc.type}
                              onClick={() => handleUploadClick(doc.type)}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                                isRejected 
                                  ? "bg-red-500 hover:bg-red-600 focus-visible:ring-red-500" 
                                  : "bg-[#00b2de] hover:bg-[#0096c7] focus-visible:ring-[#00b2de]"
                              )}
                            >
                              {uploading === doc.type ? (
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
                  })}
                </ul>
              </div>
            )}

            {/* TAB CONTENT: TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="relative border-l-2 border-slate-200 ml-4 pl-8 py-2 space-y-10">
                  {timeline.map((step, idx) => {
                    const isCompleted = step.status === 'completed'
                    const total = step.items.length
                    const done = step.items.filter((i: any) => i.done).length
                    const colorData = CATEGORY_COLORS[step.category] || { bg: 'bg-slate-100', text: 'text-slate-600', fill: 'bg-slate-500', border: 'border-slate-200' }

                    return (
                      <div key={step.category} className="relative">
                        {/* Point sur la ligne */}
                        <div className={cn(
                          "absolute -left-[41px] flex size-8 items-center justify-center rounded-full border-4 border-white shadow-sm transition-colors",
                          isCompleted ? colorData.fill : "bg-slate-200",
                          isCompleted ? "text-white" : "text-transparent"
                        )}>
                          <Check className="size-4" />
                        </div>

                        {/* Contenu de l'étape */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 transition-shadow hover:shadow-md">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <span className={cn("px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider", colorData.bg, colorData.text)}>
                                {step.label}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-slate-500">
                              {done}/{total}
                            </span>
                          </div>

                          {/* Mini jauge */}
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-5">
                            <div 
                              className={cn("h-full rounded-full transition-all duration-500", colorData.fill)}
                              style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                            />
                          </div>

                          <ul className="space-y-3">
                            {step.items.map((item: any) => {
                              const isDoc = item.id.startsWith('doc-')
                              return (
                                <li key={item.id} className="flex items-start gap-3">
                                  <div className={cn(
                                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                                    item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white"
                                  )}>
                                    {item.done && <Check className="size-3" />}
                                  </div>
                                  <span className={cn(
                                    "text-sm font-medium",
                                    item.done ? "text-slate-400 line-through decoration-slate-300" : "text-slate-700"
                                  )}>
                                    {item.label}
                                    {isDoc && <span className="ml-2 text-[10px] uppercase font-bold text-[#00b2de] bg-[#00b2de]/10 px-1.5 py-0.5 rounded">Document</span>}
                                  </span>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
            <p className="mt-8 flex justify-center text-xs text-slate-400 text-center max-w-sm mx-auto">
              Vos données sont stockées de manière sécurisée et ne sont accessibles que par le département des Ressources Humaines de BSN Engineering.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
