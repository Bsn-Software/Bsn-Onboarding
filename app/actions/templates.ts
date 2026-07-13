'use server'

import { createClient } from '@/lib/supabase/server'
import type { ChecklistTemplate } from './checklist'

export async function getAllTemplates(): Promise<ChecklistTemplate[]> {
  const supabase = await createClient()

  // On récupère tous les templates (actifs et inactifs)
  const { data, error } = await supabase
    .from('checklist_item_templates')
    .select('*')
    .order('phase')
    .order('category')
    .order('order_index')

  if (error) {
    console.error('Erreur getAllTemplates:', error)
    throw error
  }

  return data ?? []
}

export async function createTemplate(templateData: Partial<ChecklistTemplate>) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('checklist_item_templates')
    .insert([{
      phase: templateData.phase,
      category: templateData.category,
      label: templateData.label,
      description: templateData.description,
      is_document: templateData.is_document || false,
      is_active: templateData.is_active !== undefined ? templateData.is_active : true,
      order_index: templateData.order_index || 0,
      due_offset: templateData.due_offset,
      is_conditional: templateData.is_conditional || false,
      condition_label: templateData.condition_label,
      headquarters_only: templateData.headquarters_only || false,
      is_required: templateData.is_required !== undefined ? templateData.is_required : true,
    }])
    .select()
    .single()

  if (error) {
    console.error('Erreur createTemplate:', error)
    return { error: error.message }
  }

  return { data, success: true }
}

export async function updateTemplate(id: string, updates: Partial<ChecklistTemplate>) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('checklist_item_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erreur updateTemplate:', error)
    return { error: error.message }
  }

  return { data, success: true }
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient()

  // Suppression logique : is_active = false
  // On pourrait aussi faire une vraie suppression, mais s'il y a des "completions" liées, 
  // une suppression logique est plus sûre pour l'intégrité de l'historique.
  const { error } = await supabase
    .from('checklist_item_templates')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    console.error('Erreur deleteTemplate:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function hardDeleteTemplate(id: string) {
  const supabase = await createClient()

  // Suppression physique pour corriger les erreurs de manipulation
  const { error } = await supabase
    .from('checklist_item_templates')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erreur hardDeleteTemplate:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function updateTemplatesOrder(updates: { 
  id: string, 
  order_index: number, 
  category?: string,
  is_conditional?: boolean,
  condition_label?: string | null
}[]) {
  const supabase = await createClient()

  // Supabase doesn't support bulk upsert effectively with just update
  // So we will loop through and update each one. It's safe enough since categories are small.
  for (const item of updates) {
    const payload: any = { order_index: item.order_index }
    if (item.category) payload.category = item.category
    if (item.is_conditional !== undefined) {
      payload.is_conditional = item.is_conditional
      payload.condition_label = item.condition_label
    }

    const { error } = await supabase
      .from('checklist_item_templates')
      .update(payload)
      .eq('id', item.id)

    if (error) {
      console.error('Erreur updateTemplatesOrder:', error)
      return { error: error.message }
    }
  }

  return { success: true }
}
