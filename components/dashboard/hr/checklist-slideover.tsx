'use client'

import { useEffect, useState, useTransition } from 'react'
import { CheckCircle2, ChevronDown, ChevronRight, X, ExternalLink, Check, Bell, Loader2, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChecklistTemplate, CollaboratorRow, Completion } from '@/app/actions/checklist'
import { toggleChecklistItem, updateHrNotes, toggleChecklistCondition } from '@/app/actions/checklist'
import { updateDocumentStatus, sendDocumentReminder, sendGroupedDocumentReminder, toggleDocument } from '@/app/actions/documents'
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
  const [localActiveConditions, setLocalActiveConditions] = useState<string[]>(row?.active_conditions ?? [])
  const [togglingCondition, setTogglingCondition] = useState<string | null>(null)

  // Sync local conditions when row changes (e.g. after onRefresh)
  useEffect(() => {
    setLocalActiveConditions(row?.active_conditions ?? [])
  }, [row?.active_conditions])

  // Mettre à jour les notes quand le collaborateur change
  useEffect(() => {
    setNotes(row?.hr_notes ?? '')
    setNotesSaved(false)
  }, [row?.checklist_id])

  if (!row) return null

  const collab = row.collaborator
  const name = [collab?.first_name, collab?.last_name].filter(Boolean).join(' ') || collab?.email || '—'

  // Grouper TOUS les templates par catégorie (conditionnels inclus)
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

  const handleToggleCondition = async (conditionLabel: string, currentlyActive: boolean) => {
    setTogglingCondition(conditionLabel)
    // Optimistic update
    setLocalActiveConditions(prev =>
      currentlyActive ? prev.filter(c => c !== conditionLabel) : [...prev, conditionLabel]
    )
    try {
      await toggleChecklistCondition(row.checklist_id, conditionLabel, !currentlyActive)
      onRefresh()
    } catch (err) {
      // Rollback
      setLocalActiveConditions(prev =>
        currentlyActive ? [...prev, conditionLabel] : prev.filter(c => c !== conditionLabel)
      )
      toast.error('Erreur lors du changement de condition')
    } finally {
      setTogglingCondition(null)
    }
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
             templates={templates.filter(t => t.category === 'documents' && (!t.is_conditional || localActiveConditions.includes(t.condition_label!)))}
             documents={row.documents}
             checklistId={row.checklist_id}
             collaboratorId={collab?.id}
             isOpen={openCategories.has('documents')}
             onToggle={() => toggleCategory('documents')}
             onRefresh={onRefresh}
          />

          {Object.entries(byCategory).map(([cat, allItems]) => {
            if (cat === 'documents') return null

            const meta = CATEGORY_LABELS[cat] ?? { label: cat, color: 'bg-slate-100 text-slate-600' }
            const isOpen = openCategories.has(cat)

            // Séparer items normaux et groupes conditionnels
            const regularItems = allItems.filter(t => !t.is_conditional)
            const conditionalGroups: Record<string, ChecklistTemplate[]> = {}
            allItems.filter(t => t.is_conditional).forEach(t => {
              const key = t.condition_label || ''
              if (!conditionalGroups[key]) conditionalGroups[key] = []
              conditionalGroups[key].push(t)
            })

            // Compter les items actifs pour le badge
            const activeItems = [
              ...regularItems,
              ...Object.entries(conditionalGroups)
                .filter(([label]) => localActiveConditions.includes(label))
                .flatMap(([, items]) => items)
            ]
            const doneCount = activeItems.filter(t => completionMap.get(t.id)?.completed_at != null).length
            const totalCount = activeItems.length

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
                    <span className="text-xs text-slate-500">{doneCount}/{totalCount}</span>
                    {Object.keys(conditionalGroups).length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        <Layers className="size-2.5" />
                        {Object.keys(conditionalGroups).length} groupe{Object.keys(conditionalGroups).length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {isOpen ? (
                    <ChevronDown className="size-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="size-4 text-slate-400" />
                  )}
                </button>

                {isOpen && (
                  <div>
                    {/* Items normaux */}
                    {regularItems.length > 0 && (
                      <ul className="divide-y divide-slate-100">
                        {regularItems.map(template => {
                          const completion = completionMap.get(template.id)
                          const isDone = completion?.completed_at != null
                          return (
                            <li key={template.id} className={cn(
                              'flex items-start gap-3 px-4 py-3 transition-colors',
                              isDone ? 'bg-[#00b2de]/5' : 'bg-white hover:bg-slate-50'
                            )}>
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
                              <div className="min-w-0 flex-1">
                                <p className={cn(
                                  'text-sm leading-snug',
                                  isDone ? 'text-slate-400 line-through' : 'text-slate-800 font-medium'
                                )}>
                                  {template.label}
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

                    {/* Groupes conditionnels */}
                    {Object.entries(conditionalGroups).map(([groupLabel, groupItems]) => {
                      const isActive = localActiveConditions.includes(groupLabel)
                      const isToggling = togglingCondition === groupLabel
                      const doneGroupCount = groupItems.filter(t => completionMap.get(t.id)?.completed_at != null).length

                      return (
                        <div key={groupLabel} className={cn(
                          "border-t border-slate-100",
                        )}>
                          {/* En-tête du groupe */}
                          <div className={cn(
                            "flex items-center justify-between px-4 py-2.5 gap-3",
                            isActive ? "bg-amber-50" : "bg-slate-50"
                          )}>
                            <div className="flex items-center gap-2 min-w-0">
                              <Layers className={cn("size-3.5 shrink-0", isActive ? "text-amber-600" : "text-slate-400")} />
                              <span className={cn("text-xs font-semibold truncate", isActive ? "text-amber-800" : "text-slate-500")}>
                                {groupLabel}
                              </span>
                              {isActive && (
                                <span className="text-[10px] text-amber-600 font-medium shrink-0">
                                  {doneGroupCount}/{groupItems.length}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleCondition(groupLabel, isActive)}
                              disabled={isToggling}
                              className={cn(
                                "relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 shadow-sm disabled:opacity-50",
                                isActive ? "bg-amber-500" : "bg-slate-300"
                              )}
                            >
                              {isToggling ? (
                                <Loader2 className="absolute inset-0 m-auto size-2.5 animate-spin text-white" />
                              ) : (
                                <span className={cn(
                                  "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200",
                                  isActive ? "translate-x-3" : "translate-x-0"
                                )} />
                              )}
                            </button>
                          </div>

                          {/* Items du groupe si actif */}
                          {isActive && (
                            <ul className="divide-y divide-amber-50/80">
                              {groupItems.map(template => {
                                const completion = completionMap.get(template.id)
                                const isDone = completion?.completed_at != null
                                return (
                                  <li key={template.id} className={cn(
                                    'flex items-start gap-3 pl-8 pr-4 py-3 transition-colors',
                                    isDone ? 'bg-amber-50/30' : 'bg-white hover:bg-amber-50/20'
                                  )}>
                                    <button
                                      type="button"
                                      onClick={() => handleToggle(template.id, !isDone)}
                                      disabled={isPending}
                                      className={cn(
                                        'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                                        isDone
                                          ? 'border-amber-500 bg-amber-500 text-white'
                                          : 'border-slate-300 bg-white hover:border-amber-400'
                                      )}
                                    >
                                      {isDone && <CheckCircle2 className="size-3.5" />}
                                    </button>
                                    <div className="min-w-0 flex-1">
                                      <p className={cn(
                                        'text-sm leading-snug',
                                        isDone ? 'text-slate-400 line-through' : 'text-slate-800 font-medium'
                                      )}>
                                        {template.label}
                                      </p>
                                      {template.description && (
                                        <p className="mt-0.5 text-xs text-slate-400">{template.description}</p>
                                      )}
                                      {isDone && completion?.completed_at && (
                                        <p className="mt-0.5 text-xs text-amber-500">
                                          ✓ {new Date(completion.completed_at).toLocaleDateString('fr-FR')}
                                        </p>
                                      )}
                                    </div>
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

                          {!isActive && (
                            <p className="pl-8 pr-4 py-2 text-xs text-slate-400 italic">
                              Activez pour afficher les {groupItems.length} tâche{groupItems.length > 1 ? 's' : ''}.
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
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
  const [sendingGroupReminder, setSendingGroupReminder] = useState(false)
  const [isTogglingDoc, setIsTogglingDoc] = useState(false)

  const items = (templates || []).map((req: any) => {
    const doc = documents?.find((d: any) => d.type === req.id)
    return { type: req.id, label: req.label, doc }
  })

  const doneCount = items.filter(i => i.doc?.status === 'validated' || i.doc?.status === 'pending').length

  const handleDocumentToggle = async (type: string, currentStatus: string | undefined) => {
    setIsTogglingDoc(true)
    try {
      const res = await toggleDocument(checklistId, type, currentStatus)
      if (res.error) {
        toast.error(`Erreur: ${res.error}`)
      } else {
        onRefresh()
      }
    } catch (e) {
      toast.error('Erreur inattendue')
    } finally {
      setIsTogglingDoc(false)
    }
  }

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

  const handleGroupRemind = async () => {
    if (!collaboratorId) return
    setSendingGroupReminder(true)
    
    try {
      const result = await sendGroupedDocumentReminder(collaboratorId)
      if (result.error) {
        toast.error(`Erreur : ${result.error}`)
      } else {
        toast.success(`${result.count} document(s) relancé(s)`)
      }
    } catch (err) {
      toast.error("Erreur inattendue")
    } finally {
      setSendingGroupReminder(false)
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
        <div className="bg-white">
          <div className="flex justify-end p-3 border-b border-slate-100">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleGroupRemind(); }}
              disabled={sendingGroupReminder || doneCount === items.length}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 px-2 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {sendingGroupReminder ? <Loader2 className="size-3 animate-spin" /> : <Bell className="size-3" />}
              Tout relancer
            </button>
          </div>
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
                    <button
                      type="button"
                      onClick={() => handleDocumentToggle(item.type, item.doc?.status)}
                      disabled={isTogglingDoc}
                      className={cn(
                        'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors cursor-pointer',
                        isDone ? 'border-[#00b2de] bg-[#00b2de] text-white hover:bg-[#0092b8]' : 'border-slate-300 bg-white hover:border-[#00b2de]'
                      )}
                    >
                      {isDone && <CheckCircle2 className="size-3.5" />}
                    </button>
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
        </div>
      )}
    </div>
  )
}
