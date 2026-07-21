'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Récupère tous les entretiens EAD d'un collaborateur donné
 */
export async function getEntretiensByCollaborator(collaboratorId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ead_entretiens')
    .select('id, annee, statut, updated_at, collaborator_id')
    .eq('collaborator_id', collaboratorId)
    .order('annee', { ascending: false })

  if (error) {
    console.error('Erreur getEntretiensByCollaborator:', error)
    return { error: "Impossible de récupérer l'historique des entretiens." }
  }
  return { data }
}

/**
 * Récupère le contenu complet d'un entretien (incluant les signatures)
 */
export async function getEntretienById(id: string) {
  const supabase = await createClient()
  
  // Les RLS garantissent qu'on ne récupère l'entretien que si on y a droit
  // (Collaborateur lui-même, son Manager, ou RH)
  const { data: entretien, error } = await supabase
    .from('ead_entretiens')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Erreur getEntretienById:', error)
    return { error: "Entretien introuvable ou accès non autorisé." }
  }
  
  // Récupérer les signatures
  const { data: signatures, error: sigError } = await supabase
    .from('ead_signatures')
    .select('*')
    .eq('entretien_id', id)
    
  if (sigError) {
    console.error('Erreur récupération signatures:', sigError)
    // On ne bloque pas si les signatures plantent (rare)
  }

  // Récupérer le profil pour le pré-remplissage
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, job_title')
    .eq('id', entretien.collaborator_id)
    .single()

  // Récupérer la date d'entrée depuis le onboarding (si elle existe)
  const { data: checklist } = await supabase
    .from('onboarding_checklists')
    .select('entry_date')
    .eq('collaborator_id', entretien.collaborator_id)
    .eq('phase', 'entry')
    .single()

  const profileData = profile ? {
    ...profile,
    entry_date: checklist?.entry_date || null
  } : null

  return { entretien, signatures: signatures || [], profile: profileData }
}

/**
 * Initialise un nouvel entretien pour une année donnée
 * Seuls les RH ou le Manager peuvent le faire (verrouillé par RLS en base)
 */
export async function createEntretien(collaboratorId: string, annee: number) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('ead_entretiens')
    .insert({
      collaborator_id: collaboratorId,
      annee: annee,
      statut: 'brouillon'
    })
    .select('id')
    .single()

  if (error) {
    console.error('Erreur createEntretien:', error)
    return { error: "Vous n'avez pas les droits pour créer cet entretien ou il existe déjà." }
  }

  revalidatePath('/')
  return { id: data.id }
}

/**
 * Met à jour les données JSONB d'un entretien
 */
export async function upsertEntretien(id: string, updateData: any) {
  const supabase = await createClient()
  
  // Retirer les champs gérés par la base
  const cleanData = { ...updateData }
  delete cleanData.id
  delete cleanData.collaborator_id
  delete cleanData.created_at
  delete cleanData.updated_at
  
  const { error } = await supabase
    .from('ead_entretiens')
    .update(cleanData)
    .eq('id', id)

  if (error) {
    console.error('Erreur upsertEntretien:', error)
    return { error: "Erreur lors de la sauvegarde." }
  }

  return { success: true }
}

/**
 * Signe un entretien.
 * Le rôle est déterminé côté serveur en fonction de l'utilisateur authentifié.
 */
export async function signEntretien(entretienId: string) {
  const supabase = await createClient()
  
  // 1. Identifier l'utilisateur
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: "Non authentifié" }

  // 2. Récupérer l'entretien pour connaître le collaborator_id
  const { data: entretien, error: eError } = await supabase
    .from('ead_entretiens')
    .select('collaborator_id')
    .eq('id', entretienId)
    .single()

  if (eError || !entretien) return { error: "Entretien introuvable" }

  // 3. Déterminer le rôle
  let role_signataire = ''
  
  if (user.id === entretien.collaborator_id) {
    role_signataire = 'collaborateur'
  } else {
    // Vérifier si l'utilisateur est le manager du collaborateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('manager_id')
      .eq('id', entretien.collaborator_id)
      .single()
      
    if (profile?.manager_id === user.id) {
      role_signataire = 'manager'
    } else {
      return { error: "Vous n'êtes ni le collaborateur ni son manager. Vous ne pouvez pas signer." }
    }
  }

  // 4. Insérer la signature
  const { error: insertError } = await supabase
    .from('ead_signatures')
    .insert({
      entretien_id: entretienId,
      role_signataire: role_signataire,
      signe_par: user.id,
      signature_data: "Signé numériquement"
    })

  if (insertError) {
    // Peut échouer si déjà signé (contrainte UNIQUE)
    console.error('Erreur signature:', insertError)
    return { error: "Erreur lors de la signature (ou déjà signé)." }
  }

  // 5. Vérifier s'il y a maintenant 2 signatures pour passer en 'signe'
  const { count } = await supabase
    .from('ead_signatures')
    .select('*', { count: 'exact', head: true })
    .eq('entretien_id', entretienId)
    
  if (count === 2) {
    await supabase
      .from('ead_entretiens')
      .update({ statut: 'signe' })
      .eq('id', entretienId)
  }

  revalidatePath('/')
  return { success: true, role: role_signataire }
}

/**
 * Récupère l'équipe d'un manager (les collaborateurs dont il est le manager_id)
 */
export async function getManagerTeam() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [] }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, job_title, email')
    .eq('manager_id', user.id)

  if (error) {
    console.error('Erreur getManagerTeam:', error)
    return { data: [] }
  }

  return { data }
}
