'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X, Loader2, CheckCircle2, GripVertical } from 'lucide-react'
import { getAllTemplates, createTemplate, updateTemplate, deleteTemplate, updateTemplatesOrder } from '@/app/actions/templates'
import type { ChecklistTemplate } from '@/app/actions/checklist'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { id: 'documents', label: 'Documents' },
  { id: 'administrative', label: 'Administratif' },
  { id: 'health', label: 'Santé' },
  { id: 'it', label: 'Équipement IT' },
  { id: 'communication', label: 'Communication' },
  { id: 'compliance', label: 'Conformité' }
]

export function SettingsView() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [activePhase, setActivePhase] = useState<'entry' | 'exit'>('entry')
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  
  // State for the form
  const [formData, setFormData] = useState<Partial<ChecklistTemplate>>({})
  const [saving, setSaving] = useState(false)

  // Drag & Drop State
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

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
    setFormData(t)
  }

  const handleAdd = () => {
    setIsAdding(true)
    setEditingId(null)
    setFormData({
      phase: activePhase,
      category: 'administrative',
      is_active: true,
      is_document: false,
      is_required: true,
      is_conditional: false,
      headquarters_only: false,
      order_index: 0
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    setIsAdding(false)
    setFormData({})
  }

  const handleSave = async () => {
    if (!formData.label || !formData.category || !formData.phase) {
      toast.error("Veuillez remplir les champs obligatoires")
      return
    }

    setSaving(true)
    try {
      if (isAdding) {
        // Enforce is_document true for documents category
        if (formData.category === 'documents') {
          formData.is_document = true
        }
        
        const res = await createTemplate(formData)
        if (res.error) throw new Error(res.error)
        toast.success("Modèle créé")
      } else if (editingId) {
        if (formData.category === 'documents') {
          formData.is_document = true
        }
        const res = await updateTemplate(editingId, formData)
        if (res.error) throw new Error(res.error)
        toast.success("Modèle mis à jour")
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
    e.preventDefault() // Autoriser le drop
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
    const draggedItem = itemsInCategory.find(t => t.id === draggedId)
    const targetItem = itemsInCategory.find(t => t.id === dropTargetId)

    if (!draggedItem || !targetItem) {
      handleDragEnd()
      return
    }

    const newItems = [...itemsInCategory]
    const draggedIndex = newItems.findIndex(t => t.id === draggedId)
    newItems.splice(draggedIndex, 1)

    const targetIndex = newItems.findIndex(t => t.id === dropTargetId)
    newItems.splice(targetIndex, 0, draggedItem)

    const updates = newItems.map((item, index) => ({
      id: item.id,
      order_index: (index + 1) * 10
    }))

    setTemplates(prev => prev.map(t => {
      const update = updates.find(u => u.id === t.id)
      return update ? { ...t, order_index: update.order_index } : t
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

  // Render Editor Form
  const renderEditor = () => (
    <div className="bg-slate-50 border border-[#00b2de]/20 p-5 rounded-xl shadow-inner mb-6 animate-in fade-in slide-in-from-top-2">
      <h3 className="font-semibold text-slate-900 mb-4">{isAdding ? "Ajouter un modèle" : "Modifier le modèle"}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Titre (Label) *</label>
          <input 
            type="text" 
            value={formData.label || ''}
            onChange={e => setFormData({...formData, label: e.target.value})}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#00b2de]"
            placeholder="Ex: Récupérer le matériel..."
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Description / Indication</label>
          <input 
            type="text" 
            value={formData.description || ''}
            onChange={e => setFormData({...formData, description: e.target.value})}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#00b2de]"
            placeholder="Ex: Indication affichée au collaborateur"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Catégorie *</label>
          <select 
            value={formData.category || 'administrative'}
            onChange={e => setFormData({...formData, category: e.target.value})}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#00b2de]"
          >
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
          <input 
            type="checkbox" 
            checked={formData.is_required ?? true}
            onChange={e => setFormData({...formData, is_required: e.target.checked})}
            className="rounded border-slate-300 text-[#00b2de] focus:ring-[#00b2de]"
          />
          Obligatoire
        </label>
        
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
          <input 
            type="checkbox" 
            checked={formData.is_active ?? true}
            onChange={e => setFormData({...formData, is_active: e.target.checked})}
            className="rounded border-slate-300 text-[#00b2de] focus:ring-[#00b2de]"
          />
          Actif
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
          <input 
            type="checkbox" 
            checked={formData.headquarters_only ?? false}
            onChange={e => setFormData({...formData, headquarters_only: e.target.checked})}
            className="rounded border-slate-300 text-[#00b2de] focus:ring-[#00b2de]"
          />
          Siège uniquement
        </label>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
        <button 
          onClick={handleCancel}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
        >
          Annuler
        </button>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#00b2de] hover:bg-[#0096c7] rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Sauvegarder
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto py-8">
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

      {(isAdding || editingId) && renderEditor()}

      {/* Templates List */}
      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="size-8 animate-spin text-slate-300" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="w-10 px-2 py-3"></th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Ordre</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Catégorie</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Label</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Statut</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {CATEGORIES.map(category => {
                  const items = filteredTemplates.filter(t => t.category === category.id)
                  if (items.length === 0) return null
                  
                  return (
                    <React.Fragment key={category.id}>
                      {items.map((t, index) => (
                        <tr 
                          key={t.id} 
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, t.id)}
                          onDragOver={handleDragOver}
                          onDragEnter={(e) => handleDragEnter(e, t.id)}
                          onDrop={(e) => handleDrop(e, category.id)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "group hover:bg-slate-50 transition-colors cursor-grab active:cursor-grabbing", 
                            !t.is_active && "opacity-50",
                            draggedId === t.id && "opacity-30 bg-slate-100",
                            dropTargetId === t.id && "border-t-2 border-[#00b2de]"
                          )}
                        >
                          <td className="w-10 px-2 py-3">
                            <div className="flex items-center justify-center">
                              <GripVertical className="size-4 text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing" />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 tabular-nums">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                              {category.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className={cn("font-medium text-slate-800", !t.is_active && "line-through text-slate-400")}>{t.label}</span>
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
                      ))}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
