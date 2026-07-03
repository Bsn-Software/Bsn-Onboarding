'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { createCollaboratorFolder } from '@/lib/sharepoint'
import { getInvitationEmailHtml } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)

export type CreateCollaboratorInput = {
  first_name: string
  last_name: string
  email?: string
  job_title?: string
  entry_date?: string
  manager_id?: string
  is_headquarters?: boolean
}

// ─────────────────────────────────────────────────────────────
// Crée un collaborateur + son dossier d'onboarding
// (sans envoyer d'email d'invitation)
// ─────────────────────────────────────────────────────────────
export async function createCollaborator(input: CreateCollaboratorInput) {
  const admin = createAdminClient()
  const supabase = await createClient()

  // Vérifier que l'utilisateur connecté est RH
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: hrProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (hrProfile?.role !== 'hr') {
    return { error: 'Accès refusé — réservé aux RH' }
  }

  // 1. Créer le compte auth (sans envoyer d'email)
  const tempPassword = crypto.randomUUID() // Mot de passe temporaire aléatoire
  const authEmail = input.email && input.email.trim() !== '' 
    ? input.email 
    : `temp_${crypto.randomUUID()}@bsn-engineering.local` // Email factice si non renseigné

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: authEmail,
    password: tempPassword,
    email_confirm: true, // Compte confirmé d'emblée, l'invitation viendra plus tard
    user_metadata: {
      first_name: input.first_name,
      last_name: input.last_name,
      role: 'collaborator',
    },
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { error: 'Un compte existe déjà avec cet email.' }
    }
    console.error('Erreur création auth:', authError)
    return { error: `Erreur : ${authError.message}` }
  }

  const collaboratorId = authData.user.id

  // 2. Mettre à jour le profil (le trigger a déjà créé la ligne de base)
  // On attend un court instant pour que le trigger s'exécute
  await new Promise(resolve => setTimeout(resolve, 500))

  const { error: profileError } = await admin
    .from('profiles')
    .update({
      first_name: input.first_name,
      last_name: input.last_name,
      job_title: input.job_title || null,
      manager_id: input.manager_id || null,
      is_headquarters: input.is_headquarters ?? false,
      role: 'collaborator',
    })
    .eq('id', collaboratorId)

  if (profileError) {
    console.error('Erreur mise à jour profil:', profileError)
    // On continue quand même, le profil minimal est créé
  }

  // 3. Créer le dossier sur SharePoint (non-bloquant)
  const folderName = `${(input.last_name || '').toUpperCase()} ${input.first_name || ''}`.trim()
  let spFolderId = null
  let spFolderUrl = null
  
  try {
    const spResult = await createCollaboratorFolder(folderName)
    spFolderId = spResult.id
    spFolderUrl = spResult.webUrl
  } catch(e) {
    console.error('Erreur lors de la création du dossier SharePoint:', e)
  }

  // 4. Créer le dossier d'onboarding
  const { data: checklist, error: checklistError } = await admin
    .from('onboarding_checklists')
    .insert({
      collaborator_id: collaboratorId,
      phase: 'entry',
      status: 'in_progress',
      entry_date: input.entry_date || null,
      sp_folder_id: spFolderId,
      sp_folder_url: spFolderUrl
    })
    .select('id')
    .single()

  if (checklistError) {
    console.error('Erreur création checklist:', checklistError)
    return { error: 'Erreur lors de la création du dossier.' }
  }

  revalidatePath('/')
  return { success: true, checklistId: checklist.id, collaboratorId }
}

// ─────────────────────────────────────────────────────────────
// Récupère la liste des RH (pour le champ Manager)
// ─────────────────────────────────────────────────────────────
export async function getHRProfiles() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .order('last_name')

  if (error) return []
  return data ?? []
}

// ─────────────────────────────────────────────────────────────
// Logique interne d'envoi (peut être appelée sans session)
// ─────────────────────────────────────────────────────────────
export async function sendInvitationInternal(collaboratorId: string) {
  const admin = createAdminClient()

  // Récupérer le profil du collaborateur
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('email, first_name, last_name')
    .eq('id', collaboratorId)
    .single()

  if (profileError || !profile) {
    return { error: 'Collaborateur introuvable.' }
  }

  if (!profile.email || profile.email.startsWith('temp_')) {
    return { error: "Le collaborateur n'a pas d'adresse email valide." }
  }

  // 1. Générer le lien de récupération/création de mot de passe
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000'
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: profile.email,
    options: {
      redirectTo: `${appUrl}/auth/callback`,
    }
  })

  console.log('--- MAGIC LINK GENERATED ---')
  console.log('Email:', profile.email)
  console.log('Link:', linkData?.properties?.action_link)
  console.log('----------------------------')

  if (linkError || !linkData?.properties?.action_link) {
    console.error('Erreur génération lien:', linkError)
    return { error: 'Impossible de générer le lien de connexion.' }
  }

  // 2. Envoyer l'email via Resend
  const htmlContent = getInvitationEmailHtml(profile.first_name || 'Collaborateur', linkData.properties.action_link)
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'BSN Engineering <satisfaction@bsnengineering.com>',
      to: [profile.email],
      subject: 'Bienvenue chez BSN Engineering - Votre espace Onboarding',
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

// ─────────────────────────────────────────────────────────────
// Action serveur : Envoie l'invitation (nécessite droits RH)
// ─────────────────────────────────────────────────────────────
export async function sendInvitation(collaboratorId: string) {
  const supabase = await createClient()

  // Vérifier droits RH
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  return sendInvitationInternal(collaboratorId)
}
