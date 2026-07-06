'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X, Loader2, CheckCircle2, GripVertical, ChevronDown, ChevronRight, FileText, Layers, PlusCircle } from 'lucide-react'
import { getAllTemplates, createTemplate, updateTemplate, deleteTemplate, updateTemplatesOrder } from '@/app/actions/templates'
import type { ChecklistTemplate } from '@/app/actions/checklist'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { CATEGORY_COLORS } from './timeline-s-curve'

const CATEGORIES = [
  { id: 'documents', label: 'Documents' },
  { id: 'administrative', label: 'Administratif' },
  { id: 'health', label: 'Santé & Sécurité' },
  { id: 'it', label: 'Matériel & IT' },
  { id: 'communication', label: 'Communication' },
  { id: 'compliance', label: 'Conformité' },
]

type GroupChild = {
  label: string
  is_document: boolean
  description: string
}

const ToggleRow = ({ checked, onChange, label, desc }: { checked: boolean, onChange: (val: boolean) => void, label: string, desc?: string }) => (
  <div 
    onClick={() => onChange(!checked)}
    className="flex items-start justify-between cursor-pointer p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
  >
    <div className="pr-4 pointer-events-none">
      <div className="text-sm font-medium text-slate-800">{label}</div>
      {desc && <div className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</div>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out shadow-sm",
        checked ? "bg-[#00b2de]" : "bg-slate-200"
      )}
    >
      <span className={cn(
        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
        checked ? "translate-x-4" : "translate-x-0"
      )} />
    </button>
  </div>
)

export function SettingsView() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [activePhase, setActivePhase] = useState<'entry' | 'exit'>('entry')
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  
  // State for the form
  const [formData, setFormData] = useState<Partial<ChecklistTemplate>>({})
  const [saving, setSaving] = useState(false)

  // Conditional group state
  const [isConditionalGroup, setIsConditionalGroup] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupChildren, setGroupChildren] = useState<GroupChild[]>([
    { label: '', is_document: false, description: '' }
  ])

  // Drag & Drop State
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  // Accordion State
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const loadData = () => {
    setLoading(true)
    getAllTemplates()
      .then(res => setTemplates(res))
      .catch(err => toast.error("Erreur de chargement des modèles"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleEdit = (t: ChecklistTemplate) => {
    setEditingId(t.id)
    setIsAdding(false)
    setIsConditionalGroup(false)
    setGroupName('')
    setGroupChildren([{ label: '', is_document: false, description: '' }])
    setFormData(t)
  }

  const handleAdd = () => {
    setIsAdding(true)
    setEditingId(null)
    setIsConditionalGroup(false)
    setGroupName('')
    setGroupChildren([{ label: '', is_document: false, description: '' }])
    setFormData({
      phase: activePhase,
      category: 'administrative',
      is_active: true,
      is_document: false,
      is_required: true,
      is_conditional: false,
      headquarters_only: false,
      hr_only: false,
      order_index: 0
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    setIsAdding(false)
    setFormData({})
    setIsConditionalGroup(false)
    setGroupName('')
    setGroupChildren([{ label: '', is_document: false, description: '' }])
  }

  const addGroupChild = () => {
    setGroupChildren(prev => [...prev, { label: '', is_document: false, description: '' }])
  }

  const removeGroupChild = (index: number) => {
    setGroupChildren(prev => prev.filter((_, i) => i !== index))
  }

  const updateGroupChild = (index: number, field: keyof GroupChild, value: string | boolean) => {
    setGroupChildren(prev => prev.map((child, i) =>
      i === index ? { ...child, [field]: value } : child
    ))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isAdding && isConditionalGroup) {
        // --- Mode groupe conditionnel ---
        if (!groupName.trim()) {
          toast.error("Veuillez nommer le groupe conditionnel")
          return
        }
        const validChildren = groupChildren.filter(c => c.label.trim())
        if (validChildren.length === 0) {
          toast.error("Ajoutez au moins un item dans le groupe")
          return
        }

        for (const child of validChildren) {
          const payload: Partial<ChecklistTemplate> = {
            phase: formData.phase,
            category: formData.category,
            label: child.label.trim(),
            description: child.description.trim() || null,
            is_document: child.is_document,
            is_active: true,
            is_required: formData.is_required ?? true,
            is_conditional: true,
            condition_label: groupName.trim(),
            headquarters_only: formData.headquarters_only ?? false,
            hr_only: formData.hr_only ?? false,
            order_index: 0,
          }
          const res = await createTemplate(payload)
          if (res.error) throw new Error(res.error)
        }
        toast.success(`Groupe "${groupName.trim()}" créé avec ${validChildren.length} item(s)`)

      } else {
        // --- Mode item normal ---
        if (!formData.label || !formData.category || !formData.phase) {
          toast.error("Veuillez remplir les champs obligatoires")
          return
        }
        if (formData.is_conditional && !formData.condition_label) {
          toast.error("Veuillez préciser le libellé de la condition")
          return
        }

        if (isAdding) {
          if (formData.category === 'documents') formData.is_document = true
          const res = await createTemplate(formData)
          if (res.error) throw new Error(res.error)
          toast.success("Modèle créé")
        } else if (editingId) {
          if (formData.category === 'documents') formData.is_document = true
          const res = await updateTemplate(editingId, formData)
          if (res.error) throw new Error(res.error)
          toast.success("Modèle mis à jour")
        }
      }

      handleCancel()
      loadData()
    } catch (err: any) {
      toast.error(err.message || "Erreur de sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment désactiver ce modèle ? Il n'apparaîtra plus pour les nouveaux collaborateurs.")) return
    
    try {
      const res = await deleteTemplate(id)
      if (res.error) throw new Error(res.error)
      toast.success("Modèle désactivé")
      loadData()
    } catch (err: any) {
      toast.error(err.message || "Erreur de suppression")
    }
  }

  const filteredTemplates = templates.filter(t => t.phase === activePhase)

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragEnter = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (id !== dropTargetId) setDropTargetId(id)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDropTargetId(null)
  }

  const handleDrop = async (e: React.DragEvent, categoryId: string) => {
    e.preventDefault()
    if (!draggedId || !dropTargetId || draggedId === dropTargetId) {
      handleDragEnd()
      return
    }

    const itemsInCategory = templates.filter(t => t.category === categoryId && t.phase === activePhase)
    
    // Determine dragged items globally across all categories
    const draggedItems = draggedId.startsWith('group-') 
      ? templates.filter(t => t.is_conditional && t.condition_label === draggedId.replace('group-', '') && t.phase === activePhase)
      : [templates.find(t => t.id === draggedId)].filter(Boolean)

    if (draggedItems.length === 0) {
      handleDragEnd()
      return
    }

    const draggedIds = new Set(draggedItems.map(t => t.id as string))
    // We only keep items already in the target category that were not dragged
    const newItems = itemsInCategory.filter(t => !draggedIds.has(t.id))

    // Find the insertion point
    let targetIndex = newItems.findIndex(t => 
      dropTargetId.startsWith('group-') 
        ? (t.is_conditional && t.condition_label === dropTargetId.replace('group-', ''))
        : t.id === dropTargetId
    )
    if (targetIndex === -1) targetIndex = newItems.length

    // Update the dragged items with the new category
    const movedItems = draggedItems.map(t => ({ ...t, category: categoryId }))

    newItems.splice(targetIndex, 0, ...movedItems as ChecklistTemplate[])

    const updates = newItems.map((item, index) => ({
      id: item.id,
      order_index: (index + 1) * 10,
      category: categoryId
    }))

    setTemplates(prev => prev.map(t => {
      const update = updates.find(u => u.id === t.id)
      return update ? { ...t, order_index: update.order_index, category: update.category! } : t
    }).sort((a, b) => a.order_index - b.order_index))

    handleDragEnd()

    try {
      const res = await updateTemplatesOrder(updates)
      if (res.error) throw new Error(res.error)
      toast.success("Ordre mis à jour")
    } catch (err) {
      toast.error("Erreur de sauvegarde de l'ordre")
      loadData()
    }
  }

  // Render Editor Form (Slide-over)
  const renderEditor = () => {
    if (!isAdding && !editingId) return null

    return (
      <>
        {/* Overlay */}
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity"
          onClick={handleCancel}
        />
        
        {/* Slide-over panel */}
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
            <div>
              <h3 className="font-semibold text-slate-900">{isAdding ? "Nouveau modèle" : "Modifier le modèle"}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{isAdding ? "Créer une nouvelle tâche ou un groupe" : "Mettre à jour cette tâche"}</p>
            </div>
            <button 
              onClick={handleCancel} 
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* 1. Informations Communes */}
            <section className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">Informations Générales</h4>
              
              <div className="space-y-4">
                {/* Label / Nom du groupe */}
                {!isConditionalGroup ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Titre (Label) *</label>
                    <input 
                      type="text" 
                      value={formData.label || ''}
                      onChange={e => setFormData({...formData, label: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#00b2de] focus:ring-1 focus:ring-[#00b2de] transition-all bg-slate-50 focus:bg-white"
                      placeholder="Ex: Récupérer le matériel..."
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Nom du groupe conditionnel *</label>
                    <input 
                      type="text" 
                      value={groupName}
                      onChange={e => setGroupName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#00b2de] focus:ring-1 focus:ring-[#00b2de] transition-all bg-slate-50 focus:bg-white"
                      placeholder="Ex: Véhicule de fonction..."
                    />
                    <p className="mt-1.5 text-xs text-slate-400">Ce nom sera utilisé comme déclencheur dans le dossier du collaborateur.</p>
                  </div>
                )}
                
                {/* Description (mode normal uniquement) */}
                {!isConditionalGroup && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Description / Indication</label>
                    <input 
                      type="text" 
                      value={formData.description || ''}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#00b2de] focus:ring-1 focus:ring-[#00b2de] transition-all bg-slate-50 focus:bg-white"
                      placeholder="Ex: Indication affichée au collaborateur"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Catégorie *</label>
                  <select 
                    value={formData.category || 'administrative'}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#00b2de] focus:ring-1 focus:ring-[#00b2de] transition-all bg-slate-50 focus:bg-white appearance-none cursor-pointer"
                  >
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* 2. Mode de création (uniquement en ajout) */}
            {isAdding && (
              <section className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">Type de tâche</h4>
                
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setIsConditionalGroup(false)}
                    className={cn(
                      "flex items-center gap-4 px-5 py-4 rounded-xl border-2 text-left transition-all",
                      !isConditionalGroup
                        ? "border-[#00b2de] bg-[#00b2de]/5 text-[#00b2de]"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "flex shrink-0 size-10 items-center justify-center rounded-lg",
                      !isConditionalGroup ? "bg-[#00b2de]/10" : "bg-slate-100"
                    )}>
                      <CheckCircle2 className="size-6" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Tâche simple</div>
                      <div className="text-xs mt-0.5 opacity-70">Un seul item à cocher ou un document à uploader</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsConditionalGroup(true)}
                    className={cn(
                      "flex items-center gap-4 px-5 py-4 rounded-xl border-2 text-left transition-all",
                      isConditionalGroup
                        ? "border-[#00b2de] bg-[#00b2de]/5 text-[#00b2de]"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "flex shrink-0 size-10 items-center justify-center rounded-lg",
                      isConditionalGroup ? "bg-[#00b2de]/10" : "bg-slate-100"
                    )}>
                      <Layers className="size-6" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Groupe conditionnel</div>
                      <div className="text-xs mt-0.5 opacity-70">Plusieurs sous-tâches déclenchées manuellement</div>
                    </div>
                  </button>
                </div>
              </section>
            )}

            {/* 3A. Items du groupe (mode groupe conditionnel) */}
            {isAdding && isConditionalGroup && (
              <section className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">Items du groupe</h4>
                
                <div className="space-y-3">
                  {groupChildren.map((child, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-1"
                    >
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={child.label}
                          onChange={e => updateGroupChild(index, 'label', e.target.value)}
                          placeholder={`Item ${index + 1} (ex: Contrat)`}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#00b2de] focus:ring-1 focus:ring-[#00b2de] transition-all"
                        />
                        <input
                          type="text"
                          value={child.description}
                          onChange={e => updateGroupChild(index, 'description', e.target.value)}
                          placeholder="Description (optionnel)"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-[#00b2de] focus:ring-1 focus:ring-[#00b2de] transition-all"
                        />
                        <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg w-fit">
                          <button
                            type="button"
                            onClick={() => updateGroupChild(index, 'is_document', false)}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all select-none",
                              !child.is_document
                                ? "bg-white text-slate-800 shadow-sm"
                                : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            <CheckCircle2 className="size-3" />
                            Coche simple
                          </button>
                          <button
                            type="button"
                            onClick={() => updateGroupChild(index, 'is_document', true)}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all select-none",
                              child.is_document
                                ? "bg-white text-purple-700 shadow-sm"
                                : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            <FileText className="size-3" />
                            Document
                          </button>
                        </div>
                      </div>
                      {groupChildren.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeGroupChild(index)}
                          className="mt-1 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addGroupChild}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-500 hover:border-[#00b2de] hover:text-[#00b2de] hover:bg-[#00b2de]/5 transition-all"
                  >
                    <PlusCircle className="size-4" />
                    Ajouter un item
                  </button>
                </div>
              </section>
            )}

            {/* 3B. Options (mode tâche simple) */}
            {!isConditionalGroup && (
              <section className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">Options & Affichage</h4>
                
                <div className="space-y-3">
                  <ToggleRow 
                    checked={formData.is_active ?? true}
                    onChange={(val) => setFormData({...formData, is_active: val})}
                    label="Tâche active"
                    desc="Désactivez pour masquer temporairement cette tâche."
                  />
                  <ToggleRow 
                    checked={formData.is_required ?? true}
                    onChange={(val) => setFormData({...formData, is_required: val})}
                    label="Tâche obligatoire"
                    desc="Bloque la complétion globale si non effectuée."
                  />
                  <ToggleRow 
                    checked={formData.hr_only ?? false}
                    onChange={(val) => setFormData({...formData, hr_only: val})}
                    label="Interne RH (Masqué)"
                    desc="Cette tâche ne sera pas visible par le collaborateur."
                  />
                  <ToggleRow 
                    checked={formData.headquarters_only ?? false}
                    onChange={(val) => setFormData({...formData, headquarters_only: val})}
                    label="Siège uniquement"
                    desc="Ne s'applique qu'aux collaborateurs basés au siège."
                  />
                  <ToggleRow 
                    checked={formData.is_document ?? false}
                    onChange={(val) => setFormData({...formData, is_document: val})}
                    label="Attente d'un document"
                    desc="Demande un fichier (upload) au collaborateur."
                  />
                </div>
              </section>
            )}

            {/* 4. Options communes pour le groupe conditionnel */}
            {isAdding && isConditionalGroup && (
              <section className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">Options du groupe</h4>
                <div className="space-y-3">
                  <ToggleRow
                    checked={formData.is_required ?? true}
                    onChange={(val) => setFormData({...formData, is_required: val})}
                    label="Items obligatoires"
                    desc="Tous les items du groupe bloquent la complétion si non effectués."
                  />
                  <ToggleRow
                    checked={formData.hr_only ?? false}
                    onChange={(val) => setFormData({...formData, hr_only: val})}
                    label="Interne RH (Masqué)"
                    desc="Les items du groupe ne seront pas visibles par le collaborateur."
                  />
                  <ToggleRow
                    checked={formData.headquarters_only ?? false}
                    onChange={(val) => setFormData({...formData, headquarters_only: val})}
                    label="Siège uniquement"
                    desc="Ne s'applique qu'aux collaborateurs basés au siège."
                  />
                </div>
              </section>
            )}

            {/* 5. Logique conditionnelle (mode tâche simple en édition/ajout) */}
            {!isConditionalGroup && (
              <section className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">Logique Conditionnelle</h4>
                
                <div className="space-y-3">
                  <ToggleRow 
                    checked={formData.is_conditional ?? false}
                    onChange={(val) => setFormData({...formData, is_conditional: val, condition_label: val ? formData.condition_label : null})}
                    label="Tâche conditionnelle"
                    desc="Rattacher cet item à un groupe existant (déclenchement manuel)."
                  />
                  
                  {formData.is_conditional && (
                    <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-semibold text-amber-900 mb-1.5">
                        Nom du groupe *
                      </label>
                      <input 
                        type="text" 
                        value={formData.condition_label || ''}
                        onChange={e => setFormData({...formData, condition_label: e.target.value})}
                        className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-900 outline-none focus:border-amber-500 bg-white placeholder-amber-300/70"
                        placeholder="ex: Véhicule de fonction..."
                      />
                      <p className="mt-2 text-[11px] leading-relaxed text-amber-700/80">
                        Doit correspondre exactement au nom d'un groupe existant. Les items partageant ce nom seront activés ensemble.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
            <button 
              onClick={handleCancel}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#00b2de] hover:bg-[#0096c7] rounded-xl transition-all shadow-sm disabled:opacity-50 active:scale-[0.98]"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {isAdding
                ? isConditionalGroup
                  ? `Créer le groupe (${groupChildren.filter(c => c.label.trim()).length} item${groupChildren.filter(c => c.label.trim()).length > 1 ? 's' : ''})`
                  : "Créer la tâche"
                : "Enregistrer"
              }
            </button>
          </div>
        </div>
      </>
    )
  }

  // Render the template list, keeping the DB order, grouping contiguous condition_labels
  const renderTemplateList = (items: ChecklistTemplate[], categoryId: string) => {
    const rows: React.ReactNode[] = []
    
    type Block = { type: 'item' | 'group', id: string, label?: string, items: ChecklistTemplate[] }
    const blocks: Block[] = []
    let currentGroupLabel: string | null = null
    let currentGroupItems: ChecklistTemplate[] = []

    items.forEach((t) => {
      if (t.is_conditional && t.condition_label) {
        if (t.condition_label !== currentGroupLabel) {
          if (currentGroupLabel) {
            blocks.push({ type: 'group', id: `group-${currentGroupLabel}`, label: currentGroupLabel, items: currentGroupItems })
          }
          currentGroupLabel = t.condition_label
          currentGroupItems = [t]
        } else {
          currentGroupItems.push(t)
        }
      } else {
        if (currentGroupLabel) {
          blocks.push({ type: 'group', id: `group-${currentGroupLabel}`, label: currentGroupLabel, items: currentGroupItems })
          currentGroupLabel = null
          currentGroupItems = []
        }
        blocks.push({ type: 'item', id: t.id, items: [t] })
      }
    })
    if (currentGroupLabel) {
      blocks.push({ type: 'group', id: `group-${currentGroupLabel}`, label: currentGroupLabel, items: currentGroupItems })
    }

    blocks.forEach((block, blockIndex) => {
      if (block.type === 'item') {
        rows.push(renderTemplateRow(block.items[0], blockIndex, categoryId, false))
      } else {
        rows.push(
          <tr 
            key={block.id}
            draggable={true}
            onDragStart={(e) => handleDragStart(e, block.id)}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, block.id)}
            onDrop={(e) => handleDrop(e, categoryId)}
            onDragEnd={handleDragEnd}
            className={cn(
              "group hover:bg-slate-50 transition-colors cursor-grab active:cursor-grabbing",
              draggedId === block.id && "opacity-30 bg-slate-100",
              dropTargetId === block.id && "border-t-2 border-[#00b2de]"
            )}
          >
            <td className="w-10 px-2 py-3">
              <div className="flex items-center justify-center">
                <GripVertical className="size-4 text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing" />
              </div>
            </td>
            <td colSpan={4} className="px-4 pt-4 pb-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                  <Layers className="size-3 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-700">Groupe conditionnel</span>
                  <span className="text-xs font-bold text-amber-900 ml-0.5">— {block.label}</span>
                </div>
                <span className="text-xs text-slate-400">{block.items.length} item{block.items.length > 1 ? 's' : ''}</span>
              </div>
            </td>
          </tr>
        )
        block.items.forEach((t, childIndex) => {
          rows.push(renderTemplateRow(t, childIndex, categoryId, true))
        })
      }
    })

    return rows
  }

  const renderTemplateRow = (t: ChecklistTemplate, index: number, categoryId: string, isChild = false) => (
    <tr 
      key={t.id} 
      draggable={true}
      onDragStart={(e) => handleDragStart(e, t.id)}
      onDragOver={handleDragOver}
      onDragEnter={(e) => handleDragEnter(e, t.id)}
      onDrop={(e) => handleDrop(e, categoryId)}
      onDragEnd={handleDragEnd}
      className={cn(
        "group hover:bg-slate-50 transition-colors cursor-grab active:cursor-grabbing", 
        !t.is_active && "opacity-50",
        draggedId === t.id && "opacity-30 bg-slate-100",
        dropTargetId === t.id && "border-t-2 border-[#00b2de]",
        isChild && "bg-amber-50/30"
      )}
    >
      <td className="w-10 px-2 py-3">
        <div className="flex items-center justify-center">
          {isChild && <div className="w-4 border-l-2 border-b-2 border-amber-200 h-3 rounded-bl-sm ml-1 mr-1" />}
          <GripVertical className="size-4 text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing" />
        </div>
      </td>
      <td className="px-4 py-3 text-slate-500 tabular-nums">
        {isChild ? '↳' : index + 1}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={cn("font-medium text-slate-800", !t.is_active && "line-through text-slate-400")}>{t.label}</span>
            {t.is_document && (
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                <FileText className="size-3" />
                Doc
              </span>
            )}
            {t.hr_only && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                RH
              </span>
            )}
          </div>
          {t.description && <span className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{t.description}</span>}
        </div>
      </td>
      <td className="px-4 py-3">
        {t.is_active ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium"><CheckCircle2 className="size-3" /> Actif</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-medium"><X className="size-3" /> Inactif</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <button onClick={() => handleEdit(t)} className="p-1.5 text-slate-400 hover:text-[#00b2de] hover:bg-[#00b2de]/10 rounded-md transition-colors" title="Modifier">
            <Edit2 className="size-4" />
          </button>
          {t.is_active && (
            <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Désactiver">
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )

  return (
    <div className="flex flex-col min-h-full w-full max-w-5xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Paramètres des Modèles</h1>
        <p className="text-slate-500 mt-1">Gérez les documents et tâches demandés lors de l'intégration ou du départ.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => { setActivePhase('entry'); handleCancel() }}
          className={cn(
            "px-4 py-2 font-medium text-sm transition-colors border-b-2",
            activePhase === 'entry' ? "border-[#00b2de] text-[#00b2de]" : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          Entrées (Onboarding)
        </button>
        <button
          onClick={() => { setActivePhase('exit'); handleCancel() }}
          className={cn(
            "px-4 py-2 font-medium text-sm transition-colors border-b-2",
            activePhase === 'exit' ? "border-[#00b2de] text-[#00b2de]" : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          Sorties (Offboarding)
        </button>
      </div>

      <div className="mb-4 flex justify-between items-center">
        <h2 className="font-semibold text-slate-800">
          Liste des éléments ({activePhase === 'entry' ? 'Entrée' : 'Sortie'})
        </h2>
        {!isAdding && !editingId && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-slate-700 transition-colors"
          >
            <Plus className="size-4" />
            Ajouter un élément
          </button>
        )}
      </div>

      {renderEditor()}

      {/* Templates List */}
      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="size-8 animate-spin text-slate-300" /></div>
      ) : (
        <div className="space-y-6">
          {CATEGORIES.map(category => {
            const items = filteredTemplates.filter(t => t.category === category.id)
            
            const catColors = CATEGORY_COLORS[category.id] || { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" }

            const isOpen = openCategories.has(category.id)

            return (
              <div key={category.id} className={cn("bg-white rounded-xl border overflow-hidden shadow-sm animate-in fade-in transition-all", catColors.border)}>
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={cn("w-full px-4 py-3 font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity", catColors.bg, catColors.text, isOpen && "border-b", isOpen ? catColors.border : "border-transparent")}
                >
                  {isOpen ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                  {category.label}
                  <span className="ml-auto text-xs font-medium bg-white/50 px-2 py-0.5 rounded-full">{items.length} élément{items.length > 1 ? 's' : ''}</span>
                </button>
                {isOpen && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="w-10 px-2 py-3"></th>
                        <th className="px-4 py-3 font-semibold text-slate-600 w-20">Ordre</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Label</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 w-32">Statut</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-right w-32">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.length > 0 ? (
                        renderTemplateList(items, category.id)
                      ) : (
                        <tr 
                          onDragOver={handleDragOver} 
                          onDragEnter={(e) => handleDragEnter(e, category.id)}
                          onDrop={(e) => handleDrop(e, category.id)}
                          className={cn(
                            "transition-colors",
                            dropTargetId === category.id && "bg-slate-50 border-t-2 border-[#00b2de]"
                          )}
                        >
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500 border-dashed border-2 border-slate-200 m-4 rounded-xl">
                            Aucun élément. Glissez-déposez ici.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
