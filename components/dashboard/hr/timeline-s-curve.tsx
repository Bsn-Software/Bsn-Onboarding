"use client"

import { useState, useEffect } from "react"
import {
  CheckCircle2,
  FileText,
  X,
  FileBadge,
  ShieldCheck,
  Laptop,
  MessageSquare,
  Stethoscope,
  FolderOpen,
  Check,
  Bell,
  Loader2,
  Layers,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { updateDocumentStatus, sendDocumentReminder, sendGroupedDocumentReminder, toggleDocument } from '@/app/actions/documents'
import { toggleChecklistCondition } from '@/app/actions/checklist'
import { toast } from 'sonner'

export const CATEGORY_COLORS: Record<string, { bg: string, text: string, border: string, fill: string }> = {
  documents: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', fill: 'bg-amber-500' },
  administrative: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', fill: 'bg-indigo-500' },
  health: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', fill: 'bg-emerald-500' },
  it: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', fill: 'bg-sky-500' },
  communication: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', fill: 'bg-rose-500' },
  compliance: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', fill: 'bg-slate-500' },
}

export const ICONS: Record<string, any> = {
  documents: FolderOpen,
  administrative: FileBadge,
  health: Stethoscope,
  it: Laptop,
  communication: MessageSquare,
  compliance: ShieldCheck,
}

// Fonction utilitaire pour le tracé dynamique du S-Curve (SVG)
function generateSCurvePath(totalItems: number, columns = 3) {
  if (totalItems <= 1) return ''
  const rows = Math.ceil(totalItems / columns)
  const rowHeight = 100 / rows
  let d = ''

  for (let i = 0; i < totalItems; i++) {
    const r = Math.floor(i / columns)
    const isEvenRow = r % 2 === 0
    const c = isEvenRow ? (i % columns) : (columns - 1) - (i % columns)
    
    // Position X en pourcentage pour 3 colonnes (16.6%, 50%, 83.3%)
    const x = ((c + 0.5) / columns) * 100
    // Position Y au centre de chaque ligne
    const y = ((r + 0.5) / rows) * 100

    if (i === 0) {
      d += `M ${x} ${y} `
    } else {
      const prevR = Math.floor((i - 1) / columns)
      if (prevR === r) {
        // Ligne droite sur la même rangée
        d += `L ${x} ${y} `
      } else {
        // Nouvelle rangée -> on dessine le virage
        const prevIsEvenRow = prevR % 2 === 0
        const prevY = ((prevR + 0.5) / rows) * 100
        if (prevIsEvenRow) {
          // Virage à droite
          d += `C 95 ${prevY} 95 ${y} 83.3 ${y} `
        } else {
          // Virage à gauche
          d += `C 5 ${prevY} 5 ${y} 16.6 ${y} `
        }
      }
    }
  }
  return d
}

// Fonction pour définir la position CSS Grid dynamique
function getGridStyles(index: number, columns = 3) {
  const row = Math.floor(index / columns)
  const isEvenRow = row % 2 === 0
  const colIndex = isEvenRow ? (index % columns) : (columns - 1) - (index % columns)
  
  return {
    '--md-col': colIndex + 1,
    '--md-row': row + 1,
  } as React.CSSProperties
}

interface TimelineSCurveProps {
  data: any
  onToggleItem: (itemId: string, currentDone: boolean) => Promise<void>
  onRefresh?: () => void
}

export function TimelineSCurve({ data, onToggleItem, onRefresh }: TimelineSCurveProps) {
  const [selectedStep, setSelectedStep] = useState<any>(null)
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)
  const [processingDoc, setProcessingDoc] = useState<string | null>(null)
  const [sendingGroupReminder, setSendingGroupReminder] = useState(false)
  const [localActiveConditions, setLocalActiveConditions] = useState<string[]>([])
  const [togglingCondition, setTogglingCondition] = useState<string | null>(null)
  
  const checklistId = data?.checklistId
  const collaboratorId = data?.collaborator?.id

  // Sync localActiveConditions when data changes
  useEffect(() => {
    setLocalActiveConditions(data?.activeConditions ?? [])
  }, [data?.activeConditions])

  // On écoute les changements props pour actualiser la modale si elle est ouverte
  useEffect(() => {
    if (selectedStep) {
      const updatedStep = data?.timeline?.find((s: any) => s.category === selectedStep.category)
      if (updatedStep) {
        setSelectedStep(updatedStep)
      }
    }
  }, [data])

  const handleToggleCondition = async (conditionLabel: string, currentlyActive: boolean) => {
    if (!checklistId) return
    setTogglingCondition(conditionLabel)
    // Optimistic update
    setLocalActiveConditions(prev =>
      currentlyActive ? prev.filter(c => c !== conditionLabel) : [...prev, conditionLabel]
    )
    try {
      await toggleChecklistCondition(checklistId, conditionLabel, !currentlyActive)
      onRefresh?.()
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

  const handleToggle = async (itemId: string, currentDone: boolean, isDoc?: boolean, currentStatus?: string) => {
    if (isDoc) {
      setProcessingDoc(itemId)
      try {
        const rawItemId = itemId.replace('doc-', '')
        const res = await toggleDocument(checklistId, rawItemId, currentStatus)
        if (res.error) toast.error(`Erreur: ${res.error}`)
        else onRefresh?.()
      } catch(e) {
        toast.error('Erreur inattendue')
      } finally {
        setProcessingDoc(null)
      }
      return
    }

    // Optimistic update
    if (selectedStep) {
      const newItems = selectedStep.items.map((i: any) =>
        i.id === itemId ? { ...i, done: !currentDone } : i
      )
      setSelectedStep({ ...selectedStep, items: newItems })
    }

    await onToggleItem(itemId, currentDone)
  }

  const handleValidate = async (type: string, status: 'validated' | 'rejected') => {
    if (!checklistId) return
    setProcessingDoc(type)
    try {
      await updateDocumentStatus(checklistId, type, status)
      onRefresh?.()
    } finally {
      setProcessingDoc(null)
    }
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

  return (
    <>
      <div className="relative flex-1 mt-6 bg-slate-50/50 rounded-2xl border border-slate-200/50 p-6 sm:p-10 flex flex-col justify-center min-h-0">
        <h2 className="absolute top-4 left-6 text-sm font-bold text-slate-400 uppercase tracking-widest">Chemin d'intégration</h2>

        <div className="relative w-full max-w-4xl mx-auto h-full flex flex-col justify-center">
          {/* Ligne SVG d'arrière plan (S-Curve) complète */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none hidden md:block">
            <defs>
              <marker id="arrowhead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M 10 0 L 0 5 L 10 10 z" fill="#00b2de" />
              </marker>
            </defs>
            <path
              d={generateSCurvePath(data?.timeline?.length || 0, 3)}
              fill="none"
              stroke="#00b2de"
              strokeWidth="4"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              markerEnd="url(#arrowhead)"
            />
          </svg>

          {/* Grille des nœuds */}
          <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-y-12 md:gap-y-0 gap-x-8 h-full relative z-10">
            {data.timeline.map((step: any, index: number) => {
              const isCompleted = step.status === 'completed'
              const Icon = ICONS[step.category] || CheckCircle2

              const total = step.items.length
              const done = step.items.filter((i: any) => i.done).length

              return (
                <div
                  key={index}
                  className="flex flex-col items-center justify-center md:[grid-column-start:var(--md-col)] md:[grid-row-start:var(--md-row)]"
                  style={getGridStyles(index, 3)}
                >
                  <button
                    onClick={() => setSelectedStep(step)}
                    className={cn(
                      "group relative flex flex-col items-center justify-center gap-3 w-40 sm:w-48 p-4 rounded-2xl shadow-sm border-2 cursor-pointer transition-all hover:scale-105 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[#00b2de]/20",
                      CATEGORY_COLORS[step.category]?.bg || "bg-white",
                      CATEGORY_COLORS[step.category]?.border || "border-slate-200"
                    )}
                  >
                    {/* Badge statut absolu (si complété) */}
                    {isCompleted && (
                      <div className={cn("absolute -top-3 -right-3 size-6 text-white rounded-full flex items-center justify-center shadow-sm", CATEGORY_COLORS[step.category]?.fill || "bg-[#00b2de]")}>
                        <CheckCircle2 className="size-4" />
                      </div>
                    )}

                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/50 backdrop-blur-sm">
                      <Icon className={cn("size-6", CATEGORY_COLORS[step.category]?.text || "text-slate-600")} />
                    </div>

                    <div className={cn("text-center w-full", CATEGORY_COLORS[step.category]?.text || "text-slate-900")}>
                      <h3 className="text-sm font-bold line-clamp-1">{step.label}</h3>
                      <div className="mt-1 flex items-center justify-center gap-1.5 text-xs font-medium opacity-80">
                        {done}/{total} complété
                      </div>
                    </div>

                    {/* Mini Jauge interne */}
                    <div className="w-full h-2 bg-white border border-slate-200/80 rounded-full overflow-hidden mt-2 shadow-sm">
                      <div
                        className={cn("h-full rounded-full transition-all", CATEGORY_COLORS[step.category]?.fill || "bg-[#00b2de]")}
                        style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                      />
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Modal de Détails (Popover) ── */}
      {selectedStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={cn("flex size-10 items-center justify-center rounded-lg", CATEGORY_COLORS[selectedStep.category]?.bg || "bg-[#00b2de]/10")}>
                  {ICONS[selectedStep.category] ? (() => { const I = ICONS[selectedStep.category]; return <I className={cn("size-5", CATEGORY_COLORS[selectedStep.category]?.text || "text-[#00b2de]")} /> })() : <CheckCircle2 className="size-5 text-[#00b2de]" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedStep.label}</h3>
                  <p className="text-xs text-slate-500">{selectedStep.items.filter((i: any) => i.done).length} sur {selectedStep.items.length} tâches terminées</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedStep.category === 'documents' && (
                  <button
                    onClick={handleGroupRemind}
                    disabled={sendingGroupReminder}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 px-2 py-1.5 rounded-md transition-colors disabled:opacity-50"
                  >
                    {sendingGroupReminder ? <Loader2 className="size-3 animate-spin" /> : <Bell className="size-3" />}
                    Tout relancer
                  </button>
                )}
                <button
                  onClick={() => setSelectedStep(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto">
              {(() => {
                // Séparer items normaux et groupes conditionnels
                const regularItems = selectedStep.items.filter((i: any) => !i.is_conditional)
                const conditionalGroups: Record<string, any[]> = {}
                selectedStep.items
                  .filter((i: any) => i.is_conditional)
                  .forEach((item: any) => {
                    const key = item.condition_label || ''
                    if (!conditionalGroups[key]) conditionalGroups[key] = []
                    conditionalGroups[key].push(item)
                  })

                const renderItem = (item: any, i: number) => {
                  const isDoc = item.id?.startsWith('doc-')
                  return (
                    <li
                      key={i}
                      onClick={() => {
                        if (isDoc && processingDoc === item.id) return
                        handleToggle(item.id, item.done, isDoc, item.status)
                      }}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer",
                        "border-slate-200 bg-white hover:border-[#00b2de]/40 hover:bg-slate-50",
                        (isDoc && processingDoc === item.id) && "opacity-50 pointer-events-none"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex size-6 items-center justify-center rounded-full shrink-0 transition-colors",
                          item.done ? "bg-[#00b2de] text-white" : "border border-slate-300 bg-white text-transparent",
                          (isDoc && processingDoc === item.id) && "animate-pulse"
                        )}>
                          <CheckCircle2 className="size-3.5" />
                        </div>
                        <span className={cn("text-sm font-medium transition-colors", item.done ? "text-slate-900 line-through opacity-70" : "text-slate-700")}>
                          {item.label}
                          {isDoc && item.status === 'pending' && <span className="ml-2 text-xs font-semibold text-amber-500 line-through-none inline-block">En attente</span>}
                          {isDoc && item.status === 'rejected' && <span className="ml-2 text-xs font-semibold text-red-500 line-through-none inline-block">Refusé</span>}
                          {isDoc && item.status === 'missing' && <span className="ml-2 text-xs text-slate-400 inline-block">Manquant</span>}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.docUrl && (
                          <a
                            href={item.docUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-xs font-semibold text-[#00b2de] hover:underline bg-[#00b2de]/10 px-3 py-1.5 rounded-lg shrink-0 transition-colors"
                          >
                            <FileText className="size-3.5" />
                            Ouvrir
                          </a>
                        )}

                        {isDoc && item.status === 'pending' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleValidate(item.type, 'validated')}
                              disabled={processingDoc === item.type}
                              className="inline-flex items-center justify-center rounded-lg bg-emerald-100 p-1.5 text-emerald-700 hover:bg-emerald-200 transition-colors disabled:opacity-50"
                              title="Valider"
                            >
                              {processingDoc === item.type ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                            </button>
                            <button
                              onClick={() => handleValidate(item.type, 'rejected')}
                              disabled={processingDoc === item.type}
                              className="inline-flex items-center justify-center rounded-lg bg-red-100 p-1.5 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
                              title="Refuser"
                            >
                              {processingDoc === item.type ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                            </button>
                          </div>
                        )}

                        {isDoc && (item.status === 'missing' || item.status === 'rejected') && (
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
                        )}
                      </div>
                    </li>
                  )
                }

                return (
                  <>
                    {/* Items standards */}
                    {regularItems.length > 0 && (
                      <ul className="flex flex-col gap-3">
                        {regularItems.map((item: any, i: number) => renderItem(item, i))}
                      </ul>
                    )}

                    {/* Groupes conditionnels */}
                    {Object.entries(conditionalGroups).map(([groupLabel, groupItems]) => {
                      const isActive = localActiveConditions.includes(groupLabel)
                      const isToggling = togglingCondition === groupLabel
                      const doneCount = groupItems.filter((i: any) => i.done).length

                      return (
                        <div key={groupLabel} className={cn(
                          "mt-3 rounded-xl border-2 overflow-hidden transition-all",
                          isActive ? "border-amber-200" : "border-slate-200"
                        )}>
                          {/* En-tête du groupe */}
                          <div className={cn(
                            "flex items-center justify-between px-4 py-3 gap-3",
                            isActive ? "bg-amber-50" : "bg-slate-50"
                          )}>
                            <div className="flex items-center gap-2 min-w-0">
                              <Layers className={cn("size-4 shrink-0", isActive ? "text-amber-600" : "text-slate-400")} />
                              <span className={cn("text-sm font-semibold truncate", isActive ? "text-amber-800" : "text-slate-600")}>
                                {groupLabel}
                              </span>
                              {isActive && (
                                <span className="text-xs text-amber-600 font-medium shrink-0">
                                  {doneCount}/{groupItems.length}
                                </span>
                              )}
                            </div>
                            {/* Toggle ON/OFF */}
                            <button
                              type="button"
                              onClick={() => handleToggleCondition(groupLabel, isActive)}
                              disabled={isToggling}
                              className={cn(
                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 shadow-sm disabled:opacity-50",
                                isActive ? "bg-amber-500" : "bg-slate-300"
                              )}
                            >
                              {isToggling ? (
                                <Loader2 className="absolute inset-0 m-auto size-3 animate-spin text-white" />
                              ) : (
                                <span className={cn(
                                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                  isActive ? "translate-x-4" : "translate-x-0"
                                )} />
                              )}
                            </button>
                          </div>

                          {/* Items du groupe (visibles seulement si actif) */}
                          {isActive && (
                            <ul className="flex flex-col gap-2 p-3">
                              {groupItems.map((item: any, i: number) => renderItem(item, i))}
                            </ul>
                          )}

                          {/* Message si inactif */}
                          {!isActive && (
                            <p className="px-4 py-3 text-xs text-slate-400 italic">
                              Activez ce groupe pour afficher ses {groupItems.length} tâche{groupItems.length > 1 ? 's' : ''}.
                            </p>
                          )}
                        </div>
                      )
                    })}

                    {selectedStep.items.length === 0 && (
                      <p className="text-center text-sm text-slate-500 py-4">Aucune tâche pour cette catégorie.</p>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
