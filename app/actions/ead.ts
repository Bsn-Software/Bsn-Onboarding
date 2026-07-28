'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { getEadConfirmationEmailHtml, getEadRappelEmailHtml } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)

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

  // 3. Vérifier si un entretien existe déjà pour ce collaborateur+année
  //    La contrainte UNIQUE (collaborator_id, annee) empêche les doublons en base.
  //    On le gère applicativement pour ouvrir l'existant plutôt que d'afficher une erreur.
  const { data: existing } = await supabase
    .from('ead_entretiens')
    .select('id')
    .eq('collaborator_id', collaboratorId)
    .eq('annee', annee)
    .maybeSingle()

  if (existing) {
    // L'entretien existe déjà — on ouvre l'existant, pas d'erreur
    return { id: existing.id, alreadyExisted: true }
  }

  // 4. Insérer l'entretien (RLS confirme en second filet)
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
    return { error: "Vous n'avez pas les droits pour créer cet entretien." }
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
    // Vérifier si l'utilisateur est le manager du collaborateur ou s'il est RH
    const { data: profile } = await supabase
      .from('profiles')
      .select('manager_id, role')
      .eq('id', user.id)
      .single()

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('manager_id')
      .eq('id', entretien.collaborator_id)
      .single()
      
    if (targetProfile?.manager_id === user.id) {
      role_signataire = 'manager'
    } else if (profile?.role === 'hr') {
      // RH : déterminer quelle signature manque
      const { data: existingSigs } = await supabase
        .from('ead_signatures')
        .select('role_signataire')
        .eq('entretien_id', entretienId)
      
      const hasManager = existingSigs?.some(s => s.role_signataire === 'manager')
      const hasCollab = existingSigs?.some(s => s.role_signataire === 'collaborateur')

      if (!hasManager) {
        role_signataire = 'manager'
      } else if (!hasCollab) {
        role_signataire = 'collaborateur'
      } else {
        return { error: "L'entretien est déjà entièrement signé." }
      }
    } else {
      return { error: "Vous n'êtes ni le collaborateur ni son manager (ni RH). Vous ne pouvez pas signer." }
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
    date_heure_prevue: string | null
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
  // Note : on évite le self-join sur profiles (contrainte FK auto-référentielle
  // dont le nom exact peut varier selon la version de Supabase/PostgREST).
  // On fait deux requêtes séparées à la place.
  const currentYear = new Date().getFullYear()

  let profilesQuery = supabase
    .from('profiles')
    .select('id, first_name, last_name, job_title, bu, email, manager_id')
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

  // 4b. Charger les noms des managers en une 2e requête sur les IDs uniques
  const managerIds = [...new Set(profiles.map(p => p.manager_id).filter(Boolean))] as string[]
  const managerMap = new Map<string, { first_name: string | null; last_name: string | null }>()

  if (managerIds.length > 0) {
    const { data: managers } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', managerIds)

    if (managers) {
      managers.forEach(m => managerMap.set(m.id, { first_name: m.first_name, last_name: m.last_name }))
    }
  }

  // 5. Récupérer les EAD de l'année courante pour ces collaborateurs
  const collaboratorIds = profiles.map(p => p.id)

  const { data: entretiens, error: entsError } = await supabase
    .from('ead_entretiens')
    .select('id, collaborator_id, statut, updated_at, date_heure_prevue')
    .in('collaborator_id', collaboratorIds)
    .eq('annee', currentYear)

  if (entsError) {
    console.error('Erreur getEadDashboard entretiens:', entsError)
    // On retourne quand même les profils, juste sans entretiens
  }

  // 6. Assembler les lignes du dashboard
  const entretienMap = new Map((entretiens || []).map(e => [e.collaborator_id, e]))

  const rows: DashboardRow[] = profiles.map(p => {
    const manager = p.manager_id ? managerMap.get(p.manager_id) ?? null : null
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

// ─────────────────────────────────────────────────────────────
// Interne — Envoie un email EAD et log dans ead_notifications
// Utilise adminClient (service role) pour bypasser la RLS de la table de log
// ─────────────────────────────────────────────────────────────
async function sendEadNotification(
  entretienId: string,
  type: 'confirmation' | 'rappel_j7' | 'rappel_j1',
  dateHeurePrevue: Date,
) {
  const admin = createAdminClient()

  // Récupérer le collaborateur
  const { data: entretien } = await admin
    .from('ead_entretiens')
    .select('collaborator_id')
    .eq('id', entretienId)
    .single()

  if (!entretien) return

  const { data: profile } = await admin
    .from('profiles')
    .select('first_name, email')
    .eq('id', entretien.collaborator_id)
    .single()

  if (!profile?.email) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bsn-onboarding.vercel.app'
  const lienEad = `${appUrl}/ead/${entretienId}`
  const firstName = profile.first_name || 'Collaborateur'

  let html: string
  if (type === 'confirmation') {
    html = getEadConfirmationEmailHtml(firstName, dateHeurePrevue, lienEad)
  } else {
    const jours = type === 'rappel_j1' ? 1 : 7
    html = getEadRappelEmailHtml(firstName, dateHeurePrevue, jours, lienEad)
  }

  const subjectMap = {
    confirmation: 'BSN Engineering — Votre EAD a été planifié',
    rappel_j7: 'BSN Engineering — Rappel : votre EAD dans 7 jours',
    rappel_j1: 'BSN Engineering — Rappel : votre EAD demain',
  }

  try {
    await resend.emails.send({
      from: 'BSN Engineering <satisfaction@bsnengineering.com>',
      to: [profile.email],
      subject: subjectMap[type],
      html,
    })
  } catch (err) {
    console.error(`Erreur Resend (${type}):`, err)
    // On log quand même pour ne pas perdre la traçabilité
  }

  // Log dans ead_notifications via admin (service role — bypass RLS)
  await admin.from('ead_notifications').insert({
    entretien_id: entretienId,
    type,
    date_cible: dateHeurePrevue.toISOString().split('T')[0], // date seule, clé de dédup
    destinataire_email: profile.email,
  })
}

/**
 * Met à jour la date/heure prévue d'un entretien.
 * Accessible aux RH et au Manager direct du collaborateur.
 * Envoie un email de confirmation uniquement si la date a réellement changé.
 */
export async function updateDateHeurePrevue(entretienId: string, dateHeurePrevue: string | null) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Non authentifié' }

  // 1. Récupérer l'entretien courant (date actuelle + collaborator_id)
  const { data: entretien, error: fetchErr } = await supabase
    .from('ead_entretiens')
    .select('date_heure_prevue, collaborator_id')
    .eq('id', entretienId)
    .single()

  if (fetchErr || !entretien) return { error: 'Entretien introuvable.' }

  // 2. Vérification rôle stricte
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isHR = callerProfile?.role === 'hr'

  if (!isHR) {
    // Vérifier que l'appelant est le manager_id du collaborateur LIÉ À CET ENTRETIEN PRÉCIS
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('manager_id')
      .eq('id', entretien.collaborator_id)
      .single()

    if (targetProfile?.manager_id !== user.id) {
      return { error: 'Accès refusé.' }
    }
  }

  // 3. Détecter si la date a réellement changé
  const ancienneDate = entretien.date_heure_prevue
    ? new Date(entretien.date_heure_prevue).toISOString()
    : null
  const nouvelleDate = dateHeurePrevue
    ? new Date(dateHeurePrevue).toISOString()
    : null
  const dateChanged = ancienneDate !== nouvelleDate

  // 4. UPDATE
  const { error } = await supabase
    .from('ead_entretiens')
    .update({ date_heure_prevue: dateHeurePrevue })
    .eq('id', entretienId)

  if (error) {
    console.error('Erreur updateDateHeurePrevue:', error)
    return { error: 'Erreur lors de la mise à jour.' }
  }

  // 5. Email + log uniquement si la date a changé et est non-nulle
  if (dateChanged && dateHeurePrevue) {
    // Fire-and-forget — on ne bloque pas la réponse sur l'email
    sendEadNotification(entretienId, 'confirmation', new Date(dateHeurePrevue)).catch(
      err => console.error('Erreur sendEadNotification:', err)
    )
  }

  revalidatePath('/')
  return { success: true }
}

/**
 * Récupère le résumé EAD d'un collaborateur connecté.
 * Utilisé dans la vue Collaborateur.
 * RLS garantit que chaque utilisateur ne voit que ses propres entretiens.
 */
export async function getCollaboratorEadSummary() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { prochainEntretien: null, dernierEntretienSigne: null }

  const { data: entretiens } = await supabase
    .from('ead_entretiens')
    .select('id, statut, date_heure_prevue, updated_at')
    .eq('collaborator_id', user.id)
    .order('annee', { ascending: false })

  if (!entretiens || entretiens.length === 0) {
    return { prochainEntretien: null, dernierEntretienSigne: null }
  }

  const now = new Date()

  // Prochain entretien : date_heure_prevue dans le futur, statut != signe
  const prochainEntretien = entretiens
    .filter(e => e.statut !== 'signe' && e.date_heure_prevue && new Date(e.date_heure_prevue) > now)
    .sort((a, b) => new Date(a.date_heure_prevue!).getTime() - new Date(b.date_heure_prevue!).getTime())[0] ?? null

  // Dernier entretien signé : le plus récent avec statut == signe
  const dernierEntretienSigne = entretiens
    .filter(e => e.statut === 'signe')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0] ?? null

  return { prochainEntretien, dernierEntretienSigne }
}
