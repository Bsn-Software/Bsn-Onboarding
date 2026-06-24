'use client'

import { useEffect, useState, useTransition } from 'react'
import { CheckCircle2, ChevronDown, ChevronRight, X, ExternalLink, Check, Bell, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChecklistTemplate, CollaboratorRow, Completion } from '@/app/actions/checklist'
import { toggleChecklistItem, updateHrNotes } from '@/app/actions/checklist'
import { updateDocumentStatus, sendDocumentReminder } from '@/app/actions/documents'
import { createClient } from '@/lib/supabase/client'
import { InitialsAvatar } from '../shared/initials-avatar'
import { toast } from 'sonner'

// ─────────────────────────────────────────────────────────────
// Labels lisibles par catégorie
// ─────────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  administrative: { label: 'Administratif',  color: 'bg-violet-100 text-violet-700' },
  documents:      { label: 'Documents',      color: 'bg-amber-100 text-amber-700' },
  health:         { label: 'Santé',          color: 'bg-emerald-100 text-emerald-700' },
  it:             { label: 'IT',             color: 'bg-blue-100 text-blue-700' },
  communication:  { label: 'Communication',  color: 'bg-pink-100 text-pink-700' },
  compliance:     { label: 'Conformité',     color: 'bg-slate-100 text-slate-600' },
}

// ─────────────────────────────────────────────────────────────
// Composant principal : slide-over
// ─────────────────────────────────────────────────────────────
type Props = {
  row: CollaboratorRow | null
  templates: ChecklistTemplate[]
  onClose: () => void
  onRefresh: () => void
}

export function ChecklistSlideover({ row, templates, onClose, onRefresh }: Props) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set(['administrative', 'documents', 'health', 'it', 'communication', 'compliance'])
  )
  const [notes, setNotes] = useState(row?.hr_notes ?? '')
  const [notesSaved, setNotesSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Mettre à jour les notes quand le collaborateur change
  useEffect(() => {
    setNotes(row?.hr_notes ?? '')
    setNotesSaved(false)
  }, [row?.checklist_id])

  if (!row) return null

  const collab = row.collaborator
  const name = [collab?.first_name, collab?.last_name].filter(Boolean).join(' ') || collab?.email || '—'

  // Grouper les templates par catégorie
  const byCategory = templates.reduce<Record<string, ChecklistTemplate[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = []
    acc[t.category].push(t)
    return acc
  }, {})

  // Index des complétions pour accès rapide
  const completionMap = new Map<string, Completion>(
    row.completions.map(c => [c.template_id, c])
  )

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const handleToggle = (templateId: string, checked: boolean) => {
    startTransition(async () => {
      await toggleChecklistItem(row.checklist_id, templateId, checked)
      onRefresh()
    })
  }

  const handleSaveNotes = async () => {
    await updateHrNotes(row.checklist_id, notes)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
    onRefresh()
  }

  const progress = row.total_items > 0
    ? Math.round((row.completed_items / row.total_items) * 100)
    : 0

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <InitialsAvatar name={name} size="lg" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">{name}</h2>
              <p className="text-xs text-slate-500">{collab?.job_title || collab?.email}</p>
              {row.entry_date && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Entrée le {new Date(row.entry_date).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="border-b border-slate-100 px-6 py-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-medium text-slate-700">Progression globale</span>
            <span>{row.completed_items}/{row.total_items} items · {progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#00b2de] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Checklist scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          
          <DocumentCategory 
             templates={templates.filter(t => t.category === 'documents')}
             documents={row.documents}
             checklistId={row.checklist_id}
             collaboratorId={collab?.id}
             isOpen={openCategories.has('documents')}
             onToggle={() => toggleCategory('documents')}
             onRefresh={onRefresh}
          />

          {Object.entries(byCategory).map(([cat, items]) => {
            if (cat === 'documents') return null; // Sécurité au cas où il y aurait des templates 'documents'

            const meta = CATEGORY_LABELS[cat] ?? { label: cat, color: 'bg-slate-100 text-slate-600' }
            const doneCount = items.filter(t => {
              const c = completionMap.get(t.id)
              return c?.completed_at != null
            }).length
            const isOpen = openCategories.has(cat)

            return (
              <div key={cat} className="rounded-xl border border-slate-200 overflow-hidden">
                {/* Category header */}
                <button
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className="flex w-full items-center justify-between bg-slate-50 px-4 py-2.5 text-left hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', meta.color)}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-slate-500">{doneCount}/{items.length}</span>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="size-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="size-4 text-slate-400" />
                  )}
                </button>

                {/* Items */}
                {isOpen && (
                  <ul className="divide-y divide-slate-100">
                    {items.map(template => {
                      const completion = completionMap.get(template.id)
                      const isDone = completion?.completed_at != null
                      const isNA = completion?.is_not_applicable ?? false

                      return (
                        <li key={template.id} className={cn(
                          'flex items-start gap-3 px-4 py-3 transition-colors',
                          isDone ? 'bg-[#00b2de]/5' : 'bg-white hover:bg-slate-50'
                        )}>
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={() => handleToggle(template.id, !isDone)}
                            disabled={isPending}
                            className={cn(
                              'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                              isDone
                                ? 'border-[#00b2de] bg-[#00b2de] text-white'
                                : 'border-slate-300 bg-white hover:border-[#00b2de]'
                            )}
                          >
                            {isDone && <CheckCircle2 className="size-3.5" />}
                          </button>

                          {/* Label */}
                          <div className="min-w-0 flex-1">
                            <p className={cn(
                              'text-sm leading-snug',
                              isDone ? 'text-slate-400 line-through' : 'text-slate-800 font-medium'
                            )}>
                              {template.label}
                              {template.is_conditional && (
                                <span className="ml-1.5 text-xs text-amber-500 no-underline">
                                  (conditionnel)
                                </span>
                              )}
                            </p>
                            {template.description && (
                              <p className="mt-0.5 text-xs text-slate-400">{template.description}</p>
                            )}
                            {isDone && completion?.completed_at && (
                              <p className="mt-0.5 text-xs text-[#00b2de]">
                                ✓ {new Date(completion.completed_at).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>

                          {/* Badge optionnel */}
                          {template.due_offset && (
                            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                              {template.due_offset}
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>

        {/* Notes RH */}
        <div className="border-t border-slate-200 px-6 py-4">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Notes RH
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Commentaires internes sur ce dossier..."
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#00b2de] focus:bg-white focus:ring-2 focus:ring-[#00b2de]/20 placeholder:text-slate-400"
          />
          <button
            onClick={handleSaveNotes}
            className="mt-2 flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700"
          >
            {notesSaved ? '✓ Sauvegardé' : 'Sauvegarder'}
          </button>
        </div>
      </aside>
    </>
  )
}

function DocumentCategory({ templates, documents, checklistId, collaboratorId, isOpen, onToggle, onRefresh }: any) {
  const meta = CATEGORY_LABELS['documents']
  const supabase = createClient()
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)

  const items = (templates || []).map((req: any) => {
    const doc = documents?.find((d: any) => d.type === req.id)
    return { type: req.id, label: req.label, doc }
  })

  const doneCount = items.filter(i => i.doc?.status === 'validated' || i.doc?.status === 'pending').length

  const handleValidate = async (type: string, status: 'validated' | 'rejected') => {
    await updateDocumentStatus(checklistId, type, status)
    onRefresh()
  }

  const handleRemind = async (type: string, label: string) => {
    if (!collaboratorId) return
    setSendingReminder(type)
    
    try {
      const result = await sendDocumentReminder(collaboratorId, label)
      if (result.error) {
        toast.error(`Erreur : ${result.error}`)
      } else {
        toast.success(`Relance envoyée pour "${label}"`)
      }
    } catch (err) {
      toast.error("Erreur inattendue")
    } finally {
      setSendingReminder(null)
    }
  }

  const getPublicUrl = (path: string) => {
    return supabase.storage.from('onboarding_documents').getPublicUrl(path).data.publicUrl
  }

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-slate-50 px-4 py-2.5 text-left hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', meta.color)}>
            {meta.label}
          </span>
          <span className="text-xs text-slate-500">{doneCount}/{items.length}</span>
        </div>
        {isOpen ? <ChevronDown className="size-4 text-slate-400" /> : <ChevronRight className="size-4 text-slate-400" />}
      </button>

      {isOpen && (
        <ul className="divide-y divide-slate-100">
          {items.map(item => {
            const isDone = item.doc?.status === 'validated' || item.doc?.status === 'pending'
            const isPending = item.doc?.status === 'pending'
            const isRejected = item.doc?.status === 'rejected'
            
            return (
              <li key={item.type} className={cn(
                'flex flex-col gap-2 px-4 py-3 transition-colors',
                isDone ? 'bg-[#00b2de]/5' : 'bg-white hover:bg-slate-50'
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                    isDone ? 'border-[#00b2de] bg-[#00b2de] text-white' : 'border-slate-300 bg-white'
                  )}>
                    {isDone && <CheckCircle2 className="size-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      'text-sm leading-snug',
                      isDone && !isPending ? 'text-slate-400 line-through' : 'text-slate-800 font-medium'
                    )}>
                      {item.label}
                      {isPending && <span className="ml-2 text-xs font-semibold text-amber-500">En attente de validation</span>}
                      {isRejected && <span className="ml-2 text-xs font-semibold text-red-500">Refusé</span>}
                      {!item.doc && <span className="ml-2 text-xs text-slate-400">Manquant</span>}
                    </p>
                    
                    
                    {item.doc?.file_url ? (
                      <div className="mt-2 flex items-center gap-2">
                        <a 
                          href={getPublicUrl(item.doc.file_url)} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-[#00b2de] hover:underline"
                        >
                          <ExternalLink className="size-3" />
                          Voir le document
                        </a>
                        
                        {isPending && (
                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              onClick={() => handleValidate(item.type, 'validated')}
                              className="inline-flex items-center justify-center rounded bg-emerald-100 p-1.5 text-emerald-700 hover:bg-emerald-200 transition-colors"
                              title="Valider"
                            >
                              <Check className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleValidate(item.type, 'rejected')}
                              className="inline-flex items-center justify-center rounded bg-red-100 p-1.5 text-red-700 hover:bg-red-200 transition-colors"
                              title="Refuser"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      (!item.doc || isRejected) && (
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => handleRemind(item.type, item.label)}
                            disabled={sendingReminder === item.type}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                          >
                            {sendingReminder === item.type ? (
                              <Loader2 className="size-3.5 animate-spin text-[#00b2de]" />
                            ) : (
                              <Bell className="size-3.5 text-[#00b2de]" />
                            )}
                            Relancer
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

