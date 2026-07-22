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
/**
 * Initialise un nouvel entretien pour une année donnée.
 * Vérifie côté serveur que l'appelant est RH, ou Manager du collaborateur ciblé.
 * (La RLS est un second filet — cette vérification est le premier.)
 */
export async function createEntretien(collaboratorId: string, annee: number) {
  const supabase = await createClient()

  // 1. Identifier l'appelant
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Non authentifié' }

  // 2. Récupérer son profil
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isHR = callerProfile?.role === 'hr'

  if (!isHR) {
    // Vérifier que le collaboratorId cible est bien un direct du manager appelant
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('manager_id')
      .eq('id', collaboratorId)
      .single()

    if (targetProfile?.manager_id !== user.id) {
      return { error: "Vous n'avez pas les droits pour créer un entretien pour ce collaborateur." }
    }
  }

  // 3. Insérer l'entretien (RLS confirme en second filet)
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

// ─────────────────────────────────────────────────────────────
// Types publics pour le dashboard
// ─────────────────────────────────────────────────────────────
export type DashboardRow = {
  profile: {
    id: string
    first_name: string | null
    last_name: string | null
    job_title: string | null
    bu: string | null
    email: string
    manager_first_name: string | null
    manager_last_name: string | null
    manager_id: string | null
  }
  entretien: {
    id: string
    statut: string
    updated_at: string
    date_echeance: string | null
  } | null
}

export type DashboardResult = {
  rows: DashboardRow[]
  userRole: 'hr' | 'manager'
  error?: string
}

/**
 * Récupère les données du dashboard EAD.
 * - RH : tous les collaborateurs
 * - Manager (détecté dynamiquement) : uniquement ses directs (1 niveau)
 * - Autre : { error: 'Accès refusé' }
 *
 * Utilise createClient() — RLS active, jamais le service-role.
 * TODO: étendre à la hiérarchie multi-niveaux si besoin (CTE récursif).
 */
export async function getEadDashboard(): Promise<DashboardResult> {
  const supabase = await createClient()

  // 1. Identifier l'utilisateur
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { rows: [], userRole: 'manager', error: 'Non authentifié' }

  // 2. Récupérer son profil
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isHR = callerProfile?.role === 'hr'

  // 3. Si pas RH, vérifier s'il est manager (a au moins 1 direct)
  if (!isHR) {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('manager_id', user.id)

    if (!count || count === 0) {
      // Manager sans équipe — tableau vide, pas d'erreur
      return { rows: [], userRole: 'manager' }
    }
  }

  // 4. Récupérer les collaborateurs (tous ou juste l'équipe)
  const currentYear = new Date().getFullYear()

  let profilesQuery = supabase
    .from('profiles')
    .select(`
      id,
      first_name,
      last_name,
      job_title,
      bu,
      email,
      manager_id,
      manager:profiles!profiles_manager_id_fkey(first_name, last_name)
    `)
    .eq('role', 'collaborator')
    .order('last_name')

  if (!isHR) {
    // Manager : uniquement ses directs
    profilesQuery = profilesQuery.eq('manager_id', user.id)
  }

  const { data: profiles, error: profilesError } = await profilesQuery

  if (profilesError) {
    console.error('Erreur getEadDashboard profiles:', profilesError)
    return { rows: [], userRole: isHR ? 'hr' : 'manager', error: 'Erreur lors du chargement.' }
  }

  if (!profiles || profiles.length === 0) {
    return { rows: [], userRole: isHR ? 'hr' : 'manager' }
  }

  // 5. Récupérer les EAD de l'année courante pour ces collaborateurs
  const collaboratorIds = profiles.map(p => p.id)

  const { data: entretiens, error: entsError } = await supabase
    .from('ead_entretiens')
    .select('id, collaborator_id, statut, updated_at, date_echeance')
    .in('collaborator_id', collaboratorIds)
    .eq('annee', currentYear)

  if (entsError) {
    console.error('Erreur getEadDashboard entretiens:', entsError)
    // On retourne quand même les profils, juste sans entretiens
  }

  // 6. Assembler les lignes du dashboard
  const entretienMap = new Map((entretiens || []).map(e => [e.collaborator_id, e]))

  const rows: DashboardRow[] = profiles.map(p => {
    const managerArr = p.manager as any
    const manager = Array.isArray(managerArr) ? managerArr[0] : managerArr
    return {
      profile: {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        job_title: p.job_title,
        bu: (p as any).bu ?? null,
        email: p.email,
        manager_id: p.manager_id,
        manager_first_name: manager?.first_name ?? null,
        manager_last_name: manager?.last_name ?? null,
      },
      entretien: entretienMap.get(p.id) ?? null,
    }
  })

  return { rows, userRole: isHR ? 'hr' : 'manager' }
}

/**
 * Met à jour la date d'échéance d'un entretien.
 * Réservé aux RH — vérification côté serveur avant tout UPDATE.
 * La RLS Manager permet le UPDATE général, mais pas cette colonne spécifiquement
 * sans ce garde-fou applicatif.
 */
export async function updateDateEcheance(entretienId: string, date: string | null) {
  const supabase = await createClient() // Client authentifié — RLS active

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Non authentifié' }

  // Vérification serveur : seuls les RH peuvent modifier date_echeance
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'hr') {
    return { error: "Seul un RH peut modifier l'échéance." }
  }

  const { error } = await supabase
    .from('ead_entretiens')
    .update({ date_echeance: date })
    .eq('id', entretienId)

  if (error) {
    console.error('Erreur updateDateEcheance:', error)
    return { error: 'Erreur lors de la mise à jour.' }
  }

  revalidatePath('/')
  return { success: true }
}
