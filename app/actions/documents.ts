'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { getDocumentReminderEmailHtml, getGroupedDocumentReminderEmailHtml } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)

export type DocumentType = string

export type DocumentStatus = {
  type: DocumentType
  label?: string
  hint?: string
  status: 'pending' | 'validated' | 'rejected' | 'missing'
  file_url?: string
  rejection_reason?: string
}

export async function getCollaboratorDocuments() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // 1. Trouver la checklist en cours du collaborateur
  const { data: checklist } = await supabase
    .from('onboarding_checklists')
    .select('id')
    .eq('collaborator_id', user.id)
    .order('entry_date', { ascending: false })
    .limit(1)
    .single()

  // 1b. Récupérer les templates de documents
  const { data: templates } = await supabase
    .from('checklist_item_templates')
    .select('id, label, description')
    .eq('category', 'documents')
    .eq('is_active', true)
    .order('order_index')

  const requiredDocs = (templates || []).map(t => ({
    type: t.id,
    label: t.label,
    hint: t.description || ''
  }))

  if (!checklist) {
    // S'il n'y a pas de checklist, on retourne tout manquant
    return {
      checklistId: null,
      documents: requiredDocs.map(doc => ({ type: doc.type, label: doc.label, hint: doc.hint, status: 'missing' as const }))
    }
  }

  // 2. Récupérer les documents uploadés
  const { data: uploadedDocs } = await supabase
    .from('onboarding_documents')
    .select('type, status, file_url, rejection_reason')
    .eq('checklist_id', checklist.id)

  // 3. Fusionner avec les documents requis
  const documents = requiredDocs.map(reqDoc => {
    // Prendre le plus récent s'il y en a plusieurs du même type
    const uploaded = uploadedDocs?.filter(d => d.type === reqDoc.type).pop()
    
    return {
      type: reqDoc.type,
      label: reqDoc.label,
      hint: reqDoc.hint,
      status: uploaded ? uploaded.status : 'missing',
      file_url: uploaded?.file_url,
      rejection_reason: uploaded?.rejection_reason,
    }
  })

  return { checklistId: checklist.id, documents }
}

export async function recordDocumentUpload(checklistId: string, type: string, fileName: string, fileUrl: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('onboarding_documents')
    .insert({
      checklist_id: checklistId,
      type,
      file_name: fileName,
      file_url: fileUrl,
      status: 'pending' // En attente de validation RH
    })

  if (error) {
    console.error('Erreur recordDocumentUpload:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function updateDocumentStatus(checklistId: string, type: string, status: 'validated' | 'rejected', rejectionReason?: string) {
  const supabase = await createClient()

  // On met à jour le statut du document le plus récent de ce type pour cette checklist
  // Pour éviter des problèmes si plusieurs documents existent, on utilise eq sur les deux champs. 
  // S'il y a plusieurs entrées, cela mettra à jour toutes, ce qui est acceptable ici (elles sont toutes pour le même type/checklist).
  const { error } = await supabase
    .from('onboarding_documents')
    .update({
      status,
      rejection_reason: rejectionReason || null
    })
    .eq('checklist_id', checklistId)
    .eq('type', type)

  if (error) {
    console.error('Erreur updateDocumentStatus:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function toggleDocument(checklistId: string, type: string, currentStatus: string | undefined) {
  const supabase = await createClient()

  if (currentStatus === 'validated' || currentStatus === 'pending') {
    // Uncheck: remove from db or set to rejected?
    // Since it's a toggle to cancel a manual check, deleting is safest.
    // If it was a real uploaded file, deleting it removes the file reference. That's fine if they want to uncheck it.
    const { error } = await supabase
      .from('onboarding_documents')
      .delete()
      .eq('checklist_id', checklistId)
      .eq('type', type)

    if (error) return { error: error.message }
  } else {
    // Check: validate manually without file
    const { data: existing } = await supabase
      .from('onboarding_documents')
      .select('id')
      .eq('checklist_id', checklistId)
      .eq('type', type)
      .limit(1)

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from('onboarding_documents')
        .update({ status: 'validated', rejection_reason: null })
        .eq('id', existing[0].id)
      if (error) return { error: error.message }
    } else {
      const { error } = await supabase
        .from('onboarding_documents')
        .insert({
          checklist_id: checklistId,
          type,
          status: 'validated',
          file_name: 'Fourni hors plateforme'
        })
      if (error) return { error: error.message }
    }
  }

  return { success: true }
}

export async function sendDocumentReminder(collaboratorId: string, documentLabel: string) {
  const supabase = await createClient()

  // 1. Vérifier droits RH
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const admin = createAdminClient()

  // 2. Récupérer le profil du collaborateur
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('email, first_name')
    .eq('id', collaboratorId)
    .single()

  if (profileError || !profile) {
    return { error: 'Collaborateur introuvable.' }
  }

  if (!profile.email || profile.email.startsWith('temp_')) {
    return { error: "Le collaborateur n'a pas d'adresse email valide." }
  }

  // 3. Générer le lien vers l'espace collaborateur
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000'
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: profile.email,
    options: {
      redirectTo: `${appUrl}/auth/callback`,
    }
  })

  if (linkError || !linkData?.properties?.action_link) {
    console.error('Erreur génération lien:', linkError)
    return { error: 'Impossible de générer le lien de connexion.' }
  }

  // 4. Envoyer l'email
  const htmlContent = getDocumentReminderEmailHtml(profile.first_name || 'Collaborateur', documentLabel, linkData.properties.action_link)
  
  try {
    const { error } = await resend.emails.send({
      from: 'BSN Engineering <satisfaction@bsnengineering.com>',
      to: [profile.email],
      subject: `Action requise : Document manquant (${documentLabel})`,
      html: htmlContent,
    })

    if (error) {
      console.error('Erreur Resend:', error)
      return { error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error('Erreur inattendue Resend:', err)
    return { error: err.message || 'Erreur inconnue' }
  }
}

export async function sendGroupedDocumentReminder(collaboratorId: string) {
  const supabase = await createClient()

  // 1. Vérifier droits RH
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const admin = createAdminClient()

  // 2. Récupérer le profil
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('email, first_name')
    .eq('id', collaboratorId)
    .single()

  if (profileError || !profile) return { error: 'Collaborateur introuvable.' }
  if (!profile.email || profile.email.startsWith('temp_')) return { error: "Le collaborateur n'a pas d'adresse email valide." }

  // 3. Récupérer la checklist la plus récente
  const { data: checklist } = await supabase
    .from('onboarding_checklists')
    .select('id')
    .eq('collaborator_id', collaboratorId)
    .order('entry_date', { ascending: false })
    .limit(1)
    .single()

  if (!checklist) return { error: 'Aucune checklist trouvée.' }

  // 4. Identifier les documents manquants
  const { data: templates } = await supabase
    .from('checklist_item_templates')
    .select('id, label')
    .eq('is_document', true)
    .eq('is_active', true)

  if (!templates || templates.length === 0) return { error: 'Aucun document requis configuré.' }

  const { data: uploadedDocs } = await supabase
    .from('onboarding_documents')
    .select('type, status')
    .eq('checklist_id', checklist.id)

  const missingDocsList: string[] = []
  
  templates.forEach(reqDoc => {
    // Check if there is any uploaded valid document
    const uploaded = uploadedDocs?.filter(d => d.type === reqDoc.id).pop()
    const status = uploaded ? uploaded.status : 'missing'
    if (status === 'missing' || status === 'rejected') {
      missingDocsList.push(reqDoc.label)
    }
  })

  if (missingDocsList.length === 0) {
    return { error: 'Tous les documents ont déjà été fournis ou sont en attente de validation.' }
  }

  // 5. Générer le lien vers l'espace collaborateur
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000'
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: profile.email,
    options: {
      redirectTo: `${appUrl}/auth/callback`,
    }
  })

  if (linkError || !linkData?.properties?.action_link) {
    return { error: 'Impossible de générer le lien de connexion.' }
  }

  // 6. Envoyer l'email
  const htmlContent = getGroupedDocumentReminderEmailHtml(profile.first_name || 'Collaborateur', missingDocsList, linkData.properties.action_link)
  
  try {
    const { error } = await resend.emails.send({
      from: 'BSN Engineering <satisfaction@bsnengineering.com>',
      to: [profile.email],
      subject: `Action requise : Documents manquants`,
      html: htmlContent,
    })

    if (error) return { error: error.message }
    return { success: true, count: missingDocsList.length }
  } catch (err: any) {
    return { error: err.message || 'Erreur inconnue' }
  }
}
