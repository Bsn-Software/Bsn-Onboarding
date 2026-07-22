'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ChecklistTemplate = {
  id: string
  phase: string
  category: string
  label: string
  description: string | null
  due_offset: string | null
  is_document: boolean
  is_conditional: boolean
  condition_label: string | null
  headquarters_only: boolean
  is_required: boolean
  is_active: boolean
  hr_only: boolean
  order_index: number
}

export type Completion = {
  id: string
  checklist_id: string
  template_id: string
  completed_by: string | null
  completed_at: string | null
  notes: string | null
  is_not_applicable: boolean
}

export type CollaboratorRow = {
  checklist_id: string
  phase: string
  status: string
  entry_date: string | null
  exit_date: string | null
  hr_notes: string | null
  collaborator: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
    job_title: string | null
    is_headquarters: boolean
    manager: { first_name: string | null; last_name: string | null } | null
  }
  active_conditions: string[]
  completions: Completion[]
  documents: { type: string; status: string; file_url: string; file_name: string }[]
  total_items: number
  completed_items: number
}

// ─────────────────────────────────────────────────────────────
// Récupère la liste de tous les collaborateurs avec progression
// ─────────────────────────────────────────────────────────────
export async function getCollaborators(): Promise<CollaboratorRow[]> {
  const supabase = await createClient()

  // Vérifier que l'utilisateur connecté est RH
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // Récupérer les dossiers avec les profils et les complétions
  const { data, error } = await supabase
    .from('onboarding_checklists')
    .select(`
      id,
      phase,
      status,
      entry_date,
      exit_date,
      hr_notes,
      active_conditions,
      collaborator:profiles!collaborator_id (
        id,
        first_name,
        last_name,
        email,
        job_title,
        is_headquarters,
        manager:profiles!manager_id (
          first_name,
          last_name
        )
      ),
      completions:checklist_completions (
        id,
        checklist_id,
        template_id,
        completed_by,
        completed_at,
        notes,
        is_not_applicable
      ),
      documents:onboarding_documents (
        type,
        status,
        file_url,
        file_name,
        expiration_date
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erreur getCollaborators:', error)
    throw error
  }

  // Récupérer le nombre total d'items actifs par phase avec leurs conditions
  const { data: templates } = await supabase
    .from('checklist_item_templates')
    .select('id, phase, is_conditional, condition_label')
    .eq('is_active', true)

  return (data ?? []).map((row: any) => {
    const activeConditions = row.active_conditions ?? []
    
    const rowTemplates = (templates ?? []).filter(t => {
      if (t.phase !== row.phase) return false
      if (t.is_conditional) {
        return activeConditions.includes(t.condition_label)
      }
      return true
    })
    
    const totalItems = rowTemplates.length
    
    const completedItems = (row.completions ?? []).filter(
      (c: Completion) => c.completed_at !== null && !c.is_not_applicable
    ).length
    
    // Pour calculer la progression, on compte un document comme complété s'il est validé
    const validatedDocsCount = (row.documents ?? []).filter(
      (d: any) => d.status === 'validated' || d.status === 'pending'
    ).length
    
    // On s'assure qu'on a un seul document par type
    const uniqueDocsMap = new Map();
    (row.documents ?? []).forEach((doc: any) => {
      // Si on a déjà ce type, on le garde si c'est le plus récent (on suppose l'ordre décroissant, mais la base peut renvoyer n'importe quoi. On garde le premier vu, ou on écrase)
      // Pour simplifier, on écrase pour avoir le dernier de la liste
      uniqueDocsMap.set(doc.type, doc);
    });
    const uniqueDocs = Array.from(uniqueDocsMap.values());

    const actualValidatedDocsCount = uniqueDocs.filter(
      (d: any) => d.status === 'validated' || d.status === 'pending'
    ).length;

    return {
      checklist_id: row.id,
      phase: row.phase,
      status: row.status,
      entry_date: row.entry_date,
      exit_date: row.exit_date,
      hr_notes: row.hr_notes,
      active_conditions: row.active_conditions ?? [],
      collaborator: Array.isArray(row.collaborator) ? row.collaborator[0] : row.collaborator,
      completions: row.completions ?? [],
      documents: uniqueDocs,
      total_items: totalItems,
      completed_items: completedItems + actualValidatedDocsCount,
    }
  })
}

// ─────────────────────────────────────────────────────────────
// Récupère les données d'un seul collaborateur (optimisation)
// ─────────────────────────────────────────────────────────────
export async function getCollaborator(checklistId: string): Promise<CollaboratorRow | null> {
  const supabase = await createClient()

  // Vérifier que l'utilisateur connecté est RH
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: row, error } = await supabase
    .from('onboarding_checklists')
    .select(`
      id,
      phase,
      status,
      entry_date,
      exit_date,
      hr_notes,
      active_conditions,
      collaborator:profiles!collaborator_id (
        id,
        first_name,
        last_name,
        email,
        job_title,
        is_headquarters,
        manager:profiles!manager_id (
          first_name,
          last_name
        )
      ),
      completions:checklist_completions (
        id,
        checklist_id,
        template_id,
        completed_by,
        completed_at,
        notes,
        is_not_applicable
      ),
      documents:onboarding_documents (
        type,
        status,
        file_url,
        file_name,
        expiration_date
      )
    `)
    .eq('id', checklistId)
    .single()

  if (error || !row) {
    return null
  }

  const { data: templates } = await supabase
    .from('checklist_item_templates')
    .select('id, phase, is_conditional, condition_label')
    .eq('is_active', true)

  const activeConditions = row.active_conditions ?? []
  
  const rowTemplates = (templates ?? []).filter(t => {
    if (t.phase !== row.phase) return false
    if (t.is_conditional) {
      return activeConditions.includes(t.condition_label)
    }
    return true
  })
  
  const totalItems = rowTemplates.length
  
  const completedItems = (row.completions ?? []).filter(
    (c: Completion) => c.completed_at !== null && !c.is_not_applicable
  ).length
  
  const uniqueDocsMap = new Map();
  (row.documents ?? []).forEach((doc: any) => {
    uniqueDocsMap.set(doc.type, doc);
  });
  const uniqueDocs = Array.from(uniqueDocsMap.values());

  const actualValidatedDocsCount = uniqueDocs.filter(
    (d: any) => d.status === 'validated' || d.status === 'pending'
  ).length;

  return {
    checklist_id: row.id,
    phase: row.phase,
    status: row.status,
    entry_date: row.entry_date,
    exit_date: row.exit_date,
    hr_notes: row.hr_notes,
    active_conditions: row.active_conditions ?? [],
    collaborator: (Array.isArray(row.collaborator) ? row.collaborator[0] : row.collaborator) as any,
    completions: row.completions ?? [],
    documents: uniqueDocs,
    total_items: totalItems,
    completed_items: completedItems + actualValidatedDocsCount,
  }
}


// ─────────────────────────────────────────────────────────────
// Active ou désactive une condition pour un collaborateur
// ─────────────────────────────────────────────────────────────
export async function toggleChecklistCondition(
  checklistId: string,
  conditionLabel: string,
  active: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: checklist } = await supabase
    .from('onboarding_checklists')
    .select('active_conditions')
    .eq('id', checklistId)
    .single()

  let activeConditions: string[] = checklist?.active_conditions ?? []
  
  if (active) {
    if (!activeConditions.includes(conditionLabel)) {
      activeConditions.push(conditionLabel)
    }
  } else {
    activeConditions = activeConditions.filter(c => c !== conditionLabel)
  }

  const { error } = await supabase
    .from('onboarding_checklists')
    .update({ active_conditions: activeConditions })
    .eq('id', checklistId)

  if (error) throw error
  revalidatePath('/dashboard/hr')
}

// ─────────────────────────────────────────────────────────────
// Récupère tous les templates actifs organisés par catégorie
// ─────────────────────────────────────────────────────────────
export async function getTemplates(phase = 'entry'): Promise<ChecklistTemplate[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('checklist_item_templates')
    .select('*')
    .eq('phase', phase)
    .eq('is_active', true)
    .order('category')
    .order('order_index')

  if (error) throw error
  return data ?? []
}

// ─────────────────────────────────────────────────────────────
// Coche ou décoche un item de checklist
// ─────────────────────────────────────────────────────────────
export async function toggleChecklistItem(
  checklistId: string,
  templateId: string,
  checked: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  if (checked) {
    // Upsert : créer ou mettre à jour
    const { error } = await supabase
      .from('checklist_completions')
      .upsert({
        checklist_id: checklistId,
        template_id: templateId,
        completed_by: user.id,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'checklist_id,template_id' })

    if (error) throw error
  } else {
    // Décocher = remettre completed_at à null
    const { error } = await supabase
      .from('checklist_completions')
      .update({ completed_at: null, completed_by: null })
      .eq('checklist_id', checklistId)
      .eq('template_id', templateId)

    if (error) throw error
  }

  return { success: true }
}

// ─────────────────────────────────────────────────────────────
// Met à jour les notes RH d'un dossier
// ─────────────────────────────────────────────────────────────
export async function updateHrNotes(checklistId: string, notes: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('onboarding_checklists')
    .update({ hr_notes: notes })
    .eq('id', checklistId)

  if (error) throw error
  return { success: true }
}

// ─────────────────────────────────────────────────────────────
// Crée un nouveau dossier d'onboarding pour un collaborateur
// ─────────────────────────────────────────────────────────────
export async function createOnboardingChecklist(
  collaboratorId: string,
  phase: 'entry' | 'exit',
  entryDate?: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('onboarding_checklists')
    .insert({
      collaborator_id: collaboratorId,
      phase,
      entry_date: entryDate,
      status: 'in_progress',
    })
    .select('id')
    .single()

  if (error) throw error
  return data
}

// ─────────────────────────────────────────────────────────────
// Récupère les données complètes pour la vue Timeline d'un collaborateur
// ─────────────────────────────────────────────────────────────
export async function getCollaboratorTimeline(checklistId: string, isCollaborator: boolean = false) {
  const supabase = await createClient()

  // 1. Fetch checklist & collaborator
  const { data: checklist, error: chkError } = await supabase
    .from('onboarding_checklists')
    .select(`
      id, phase, status, entry_date, active_conditions,
      collaborator:profiles!collaborator_id (
        id, first_name, last_name, email, job_title, is_headquarters
      ),
      completions:checklist_completions (
        template_id, completed_at
      )
    `)
    .eq('id', checklistId)
    .single()

  if (chkError || !checklist) throw new Error('Checklist introuvable')

  const collab = Array.isArray(checklist.collaborator) ? checklist.collaborator[0] : checklist.collaborator
  const activeConditions: string[] = checklist.active_conditions ?? []

  // 2. Fetch Templates
  const { data: templates } = await supabase
    .from('checklist_item_templates')
    .select('*')
    .eq('phase', checklist.phase)
    .eq('is_active', true)
    .order('order_index')

  // 3. Fetch Documents
  const { data: docs } = await supabase
    .from('onboarding_documents')
    .select('type, status, file_url, file_name')
    .eq('checklist_id', checklistId)

  // Construction de la timeline
  const catLabels: Record<string, string> = {
    administrative: 'Administratif',
    documents: 'Documents',
    health: 'Santé',
    it: 'Équipement IT',
    communication: 'Communication',
    compliance: 'Conformité'
  }

  // Grouper les templates par catégorie
  // Les items conditionnels sont inclus TOUJOURS (pour que le RH puisse les activer),
  // mais marqués avec is_conditional + condition_label pour l'affichage frontend.
  const groupedTemplates = (templates || []).reduce<Record<string, any[]>>((acc, t) => {
    // Si la requête vient du portail collaborateur et que la tâche est interne RH, on l'ignore
    if (isCollaborator && t.hr_only) return acc
    // Si portail collaborateur et item conditionnel non activé, on l'ignore
    if (isCollaborator && t.is_conditional && !activeConditions.includes(t.condition_label)) return acc

    if (!acc[t.category]) acc[t.category] = []

    const isCompleted = checklist.completions.some((c: any) => c.template_id === t.id && c.completed_at)

    acc[t.category].push({
      id: t.id,
      label: t.label,
      done: isCompleted,
      hr_only: t.hr_only,
      is_conditional: t.is_conditional,
      condition_label: t.condition_label,
    })
    return acc
  }, {})

  // Construire le format attendu par la timeline
  const timeline = []

  // Parcourir les catégories dans un ordre logique
  const orderedCats = ['documents', 'administrative', 'health', 'it', 'ead', 'communication', 'compliance']

  let totalItems = 0
  let completedItems = 0

  for (const cat of orderedCats) {
    const items = groupedTemplates[cat] || []

    // Ajout spécifique pour la catégorie documents : on fusionne les statuts
    if (cat === 'documents') {
      // Les items contiennent déjà les templates de documents grâce au select de checklist_item_templates
      // Il suffit de mettre à jour le champ "done" et "status" et "docUrl" pour chaque template
      items.forEach((item: any) => {
        const type = item.id // le type du document est l'id du template
        const uploadedDoc = docs?.find(d => d.type === type)
        const isDone = uploadedDoc?.status === 'validated'
        const publicUrl = uploadedDoc?.file_url ? supabase.storage.from('onboarding_documents').getPublicUrl(uploadedDoc.file_url).data.publicUrl : null

        item.type = type
        item.done = isDone
        item.status = uploadedDoc?.status || 'missing'
        item.docUrl = publicUrl
        // L'id pour le DOM peut rester `doc-${type}` ou on utilise l'id du template
        // On va garder `doc-${type}` par convention pour le frontend s'il se base dessus
        item.id = `doc-${type}`
      })
    }

    if (items.length === 0) continue

    // Pour le calcul de progression : les items conditionnels ne comptent
    // que si leur condition est active
    const countedItems = items.filter((i: any) =>
      !i.is_conditional || activeConditions.includes(i.condition_label)
    )
    const catTotal = countedItems.length
    const catDone = countedItems.filter((i: any) => i.done).length

    totalItems += catTotal
    completedItems += catDone

    let status = 'pending'
    if (catDone === catTotal) status = 'completed'
    else if (catDone > 0) status = 'in_progress'

    timeline.push({
      category: cat,
      label: catLabels[cat] || cat,
      status,
      items
    })
  }

  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  return {
    checklistId,
    phase: checklist.phase,
    collaborator: collab,
    progress,
    activeConditions,
    timeline
  }
}

// ─────────────────────────────────────────────────────────────
// Initier la sortie d'un collaborateur
// ─────────────────────────────────────────────────────────────
export async function initiateOffboarding(collaboratorId: string, exitDate?: string) {
  const supabase = await createClient()

  // Vérifier si un suivi de sortie existe déjà
  const { data: existing } = await supabase
    .from('onboarding_checklists')
    .select('id')
    .eq('collaborator_id', collaboratorId)
    .eq('phase', 'exit')
    .single()

  if (existing) {
    return { error: 'Ce collaborateur a déjà un suivi de sortie.' }
  }

  // Créer une nouvelle checklist avec phase='exit'
  const { data, error } = await supabase
    .from('onboarding_checklists')
    .insert({
      collaborator_id: collaboratorId,
      phase: 'exit',
      status: 'in_progress',
      exit_date: exitDate || null
    })
    .select()
    .single()

  if (error) {
    console.error('Erreur initiateOffboarding:', error)
    return { error: 'Erreur lors de la création du suivi de sortie' }
  }

  revalidatePath('/')
  return { data }
}
