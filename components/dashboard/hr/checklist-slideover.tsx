'use client'

import { useEffect, useState, useTransition } from 'react'
import { CheckCircle2, ChevronDown, ChevronRight, X, ExternalLink, Check, Bell, Loader2, Layers, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChecklistTemplate, CollaboratorRow, Completion } from '@/app/actions/checklist'
import { toggleChecklistItem, updateHrNotes, toggleChecklistCondition } from '@/app/actions/checklist'
import { updateDocumentStatus, sendDocumentReminder, sendGroupedDocumentReminder, toggleDocument, updateDocumentExpiration } from '@/app/actions/documents'
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
             templates={templates.filter(t => t.is_document)}
             documents={row.documents}
             checklistId={row.checklist_id}
             collaboratorId={collab?.id}
             isOpen={openCategories.has('documents')}
             onToggle={() => toggleCategory('documents')}
             onRefresh={onRefresh}
             localActiveConditions={localActiveConditions}
             togglingCondition={togglingCondition}
             handleToggleCondition={handleToggleCondition}
          />

          {Object.entries(byCategory).map(([cat, allItems]) => {
            if (cat === 'documents') return null

            const meta = CATEGORY_LABELS[cat] ?? { label: cat, color: 'bg-slate-100 text-slate-600' }
            const isOpen = openCategories.has(cat)
            
            // Process items perfectly preserving order
            type Block = { type: 'item', template: ChecklistTemplate } | { type: 'group', label: string, items: ChecklistTemplate[] }
            const blocks: Block[] = []
            let currentGroupLabel: string | null = null
            let currentGroupItems: ChecklistTemplate[] = []
            const nonDocItems = allItems.filter(t => !t.is_document)
            if (nonDocItems.length === 0) return null

            nonDocItems.forEach((t) => {
              if (t.is_conditional === true && t.condition_label && t.condition_label.trim() !== '') {
                if (t.condition_label !== currentGroupLabel) {
                  if (currentGroupLabel) blocks.push({ type: 'group', label: currentGroupLabel, items: currentGroupItems })
                  currentGroupLabel = t.condition_label
                  currentGroupItems = [t]
                } else {
                  currentGroupItems.push(t)
                }
              } else {
                if (currentGroupLabel) {
                  blocks.push({ type: 'group', label: currentGroupLabel, items: currentGroupItems })
                  currentGroupLabel = null
                  currentGroupItems = []
                }
                blocks.push({ type: 'item', template: t })
              }
            })
            if (currentGroupLabel) blocks.push({ type: 'group', label: currentGroupLabel, items: currentGroupItems })

            // Compter les items actifs pour le badge
            const activeItems = allItems.filter(t => 
              !t.is_conditional || (t.condition_label && localActiveConditions.includes(t.condition_label))
            )
            const doneCount = activeItems.filter(t => completionMap.get(t.id)?.completed_at != null).length
            const totalCount = activeItems.length
            const conditionalGroupsCount = new Set(allItems.filter(t => t.is_conditional).map(t => t.condition_label)).size

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
                    {conditionalGroupsCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        <Layers className="size-2.5" />
                        {conditionalGroupsCount} groupe{conditionalGroupsCount > 1 ? 's' : ''}
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
                    {blocks.length > 0 && (
                      <div className="divide-y divide-slate-100">
                        {blocks.map((block, bIdx) => {
                          if (block.type === 'item') {
                            const template = block.template
                            const completion = completionMap.get(template.id)
                            const isDone = completion?.completed_at != null
                            return (
                              <div key={template.id} className={cn(
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
                              </div>
                            )
                          } else {
                            // GROUP
                            const groupLabel = block.label
                            const groupItems = block.items
                            const isActive = localActiveConditions.includes(groupLabel)
                            const isToggling = togglingCondition === groupLabel
                            const doneGroupCount = groupItems.filter(t => completionMap.get(t.id)?.completed_at != null).length

                            return (
                              <div key={`group-${groupLabel}-${bIdx}`} className="bg-white">
                                {/* Group Header */}
                                <div className={cn(
                                  "flex items-center justify-between px-4 py-2.5 gap-3",
                                  isActive ? "bg-amber-50 border-y border-amber-100" : "bg-slate-50 border-y border-slate-100"
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
                                {/* Group Items */}
                                {isActive && (
                                  <div className="divide-y divide-amber-100/50 bg-amber-50/20">
                                    {groupItems.map(template => {
                                      const completion = completionMap.get(template.id)
                                      const isDone = completion?.completed_at != null
                                      return (
                                        <div key={template.id} className={cn(
                                          'flex items-start gap-3 px-4 py-3 pl-9 transition-colors',
                                          isDone ? 'bg-[#00b2de]/5' : 'hover:bg-amber-50/50'
                                        )}>
                                          <button
                                            type="button"
                                            onClick={() => handleToggle(template.id, !isDone)}
                                            disabled={isPending}
                                            className={cn(
                                              'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                                              isDone
                                                ? 'border-[#00b2de] bg-[#00b2de] text-white'
                                                : 'border-amber-300 bg-white hover:border-[#00b2de]'
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
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                                {!isActive && (
                                  <p className="pl-8 pr-4 py-2 text-xs text-slate-400 italic">
                                    Activez pour afficher les {groupItems.length} tâche{groupItems.length > 1 ? 's' : ''}.
                                  </p>
                                )}
                              </div>
                            )
                          }
                        })}
                      </div>
                    )}
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

function DocumentCategory({ templates, documents, checklistId, collaboratorId, isOpen, onToggle, onRefresh, localActiveConditions, togglingCondition, handleToggleCondition }: any) {
  const meta = CATEGORY_LABELS['documents']
  const supabase = createClient()
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)
  const [sendingGroupReminder, setSendingGroupReminder] = useState(false)
  const [isTogglingDoc, setIsTogglingDoc] = useState(false)

  // Items actifs (pour le badge)
  const activeItems = (templates || []).filter((t: any) => 
    !t.is_conditional || (t.condition_label && localActiveConditions.includes(t.condition_label))
  ).map((req: any) => {
    const doc = documents?.find((d: any) => d.type === req.id)
    return { type: req.id, label: req.label, doc, template: req }
  })
  const doneCount = activeItems.filter((i: any) => i.doc?.status === 'validated' || i.doc?.status === 'pending').length

  const allItemsMapped = (templates || []).map((req: any) => {
    const doc = documents?.find((d: any) => d.type === req.id)
    return { type: req.id, label: req.label, doc, template: req }
  })

  // Groupement
  type Block = { type: 'item', item: any } | { type: 'group', label: string, items: any[] }
  const blocks: Block[] = []
  let currentGroupLabel: string | null = null
  let currentGroupItems: any[] = []

  allItemsMapped.forEach((item: any) => {
    const t = item.template
    if (t.is_conditional === true && t.condition_label && t.condition_label.trim() !== '') {
      if (t.condition_label !== currentGroupLabel) {
        if (currentGroupLabel) blocks.push({ type: 'group', label: currentGroupLabel, items: currentGroupItems })
        currentGroupLabel = t.condition_label
        currentGroupItems = [item]
      } else {
        currentGroupItems.push(item)
      }
    } else {
      if (currentGroupLabel) {
        blocks.push({ type: 'group', label: currentGroupLabel, items: currentGroupItems })
        currentGroupLabel = null
        currentGroupItems = []
      }
      blocks.push({ type: 'item', item })
    }
  })
  if (currentGroupLabel) blocks.push({ type: 'group', label: currentGroupLabel, items: currentGroupItems })

  const conditionalGroupsCount = new Set((templates || []).filter((t: any) => t.is_conditional).map((t: any) => t.condition_label)).size

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
          <span className="text-xs text-slate-500">{doneCount}/{activeItems.length}</span>
          {conditionalGroupsCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
              <Layers className="size-2.5" />
              {conditionalGroupsCount} groupe{conditionalGroupsCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {isOpen ? <ChevronDown className="size-4 text-slate-400" /> : <ChevronRight className="size-4 text-slate-400" />}
      </button>

      {isOpen && (
        <div className="bg-white">
          <div className="flex justify-end p-3 border-b border-slate-100">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleGroupRemind(); }}
              disabled={sendingGroupReminder || doneCount === activeItems.length}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 px-2 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {sendingGroupReminder ? <Loader2 className="size-3 animate-spin" /> : <Bell className="size-3" />}
              Tout relancer
            </button>
          </div>
          {blocks.length > 0 && (
            <div className="divide-y divide-slate-100">
              {blocks.map((block, bIdx) => {
                if (block.type === 'item') {
                  const item = block.item
                  const isDone = item.doc?.status === 'validated' || item.doc?.status === 'pending'
                  const isPending = item.doc?.status === 'pending'
                  const isRejected = item.doc?.status === 'rejected'
                  
                  return (
                    <div key={item.type} className={cn(
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
                            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                              <a 
                                href={getPublicUrl(item.doc.file_url)} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-[#00b2de] hover:underline"
                              >
                                <ExternalLink className="size-3" />
                                Voir le document
                              </a>

                              <div className="flex items-center gap-2 sm:ml-4">
                                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                  Expire le :
                               </span>
                                <div className="relative">
                                  <input
                                    type="date"
                                    defaultValue={item.doc.expiration_date || ''}
                                    onChange={async (e) => {
                                      const newDate = e.target.value || null
                                      await updateDocumentExpiration(checklistId, item.type, newDate)
                                      toast.success('Date d\'expiration mise à jour')
                                      onRefresh()
                                    }}
                                    onClick={(e) => {
                                      if ('showPicker' in HTMLInputElement.prototype) {
                                        try {
                                          e.currentTarget.showPicker()
                                        } catch (err) {}
                                      }
                                    }}
                                    className={cn(
                                      "rounded-md border border-slate-200 pl-8 pr-2 py-1 text-xs outline-none focus:border-[#00b2de] cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer",
                                      item.doc.expiration_date && new Date(item.doc.expiration_date) < new Date() ? "text-red-600 border-red-300 bg-red-50" : "text-slate-700"
                                    )}
                                  />
                                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                                </div>
                              </div>
                              
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
                    </div>
                  )
                } else {
                  // GROUP
                  const groupLabel = block.label
                  const groupItems = block.items
                  const isActive = localActiveConditions.includes(groupLabel)
                  const isToggling = togglingCondition === groupLabel
                  const doneGroupCount = groupItems.filter(i => i.doc?.status === 'validated' || i.doc?.status === 'pending').length

                  return (
                    <div key={`group-${groupLabel}-${bIdx}`} className="bg-white">
                      {/* Group Header */}
                      <div className={cn(
                        "flex items-center justify-between px-4 py-2.5 gap-3",
                        isActive ? "bg-amber-50 border-y border-amber-100" : "bg-slate-50 border-y border-slate-100"
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

                      {/* Group Items */}
                      {isActive && (
                        <div className="divide-y divide-amber-100/50 bg-amber-50/20">
                          {groupItems.map(item => {
                            const isDone = item.doc?.status === 'validated' || item.doc?.status === 'pending'
                            const isPending = item.doc?.status === 'pending'
                            const isRejected = item.doc?.status === 'rejected'
                            
                            return (
                              <div key={item.type} className={cn(
                                'flex flex-col gap-2 px-4 py-3 pl-9 transition-colors',
                                isDone ? 'bg-[#00b2de]/5' : 'hover:bg-amber-50/50'
                              )}>
                                <div className="flex items-start gap-3">
                                  <button
                                    type="button"
                                    onClick={() => handleDocumentToggle(item.type, item.doc?.status)}
                                    disabled={isTogglingDoc}
                                    className={cn(
                                      'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors cursor-pointer',
                                      isDone ? 'border-[#00b2de] bg-[#00b2de] text-white hover:bg-[#0092b8]' : 'border-amber-300 bg-white hover:border-[#00b2de]'
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
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-700 shadow-sm hover:bg-amber-50 transition-colors disabled:opacity-50"
                                          >
                                            {sendingReminder === item.type ? (
                                              <Loader2 className="size-3.5 animate-spin text-amber-500" />
                                            ) : (
                                              <Bell className="size-3.5 text-amber-500" />
                                            )}
                                            Relancer
                                          </button>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {!isActive && (
                        <p className="pl-8 pr-4 py-2 text-xs text-slate-400 italic">
                          Activez pour afficher les {groupItems.length} document{groupItems.length > 1 ? 's' : ''}.
                        </p>
                      )}
                    </div>
                  )
                }
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
