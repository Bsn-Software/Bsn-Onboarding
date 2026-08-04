'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

import {
  type AbsenceType,
  type NiveauRisque,
  type CreateAbsenceData,
  type Absence,
  type AbsenceDashboardRow,
} from '@/lib/absences-config'

// ─────────────────────────────────────────────────────────────
// Helpers privés
// ─────────────────────────────────────────────────────────────

async function getCallerInfo(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return { userId: user.id, isHR: profile?.role === 'hr' }
}

async function isManagerOf(supabase: Awaited<ReturnType<typeof createClient>>, managerId: string, collaborateurId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('manager_id')
    .eq('id', collaborateurId)
    .single()
  return data?.manager_id === managerId
}

// ─────────────────────────────────────────────────────────────
// createAbsence
// Autorisé : collaborateur pour lui-même, ou RH pour tout le monde.
// declare_par est TOUJOURS déterminé côté serveur depuis la session,
// jamais reçu du client.
// ─────────────────────────────────────────────────────────────

export async function createAbsence(data: CreateAbsenceData) {
  const supabase = await createClient()
  const caller = await getCallerInfo(supabase)
  if (!caller) return { error: 'Non authentifié' }

  // Vérification des droits : soi-même ou RH
  if (!caller.isHR && data.collaborateur_id !== caller.userId) {
    return { error: "Vous ne pouvez déclarer une absence que pour vous-même." }
  }

  // Utilisation du client admin pour bypasser la RLS sur INSERT —
  // la vérification des droits est faite côté applicatif (lignes précédentes).
  const admin = createAdminClient()
  const { data: absence, error } = await admin
    .from('absences')
    .insert({
      collaborateur_id: data.collaborateur_id,
      type: data.type,
      date_debut: data.date_debut,
      date_fin_prevue: data.date_fin_prevue || null,
      mission_ou_client_concerne: data.mission_ou_client_concerne || null,
      niveau_de_risque: data.niveau_de_risque || 'aucun',
      commentaire: data.commentaire || null,
      declare_par: caller.userId, // Toujours depuis la session, jamais du client
    })
    .select('id')
    .single()

  if (error) {
    console.error('Erreur createAbsence:', error)
    return { error: "Erreur lors de la déclaration d'absence." }
  }

  revalidatePath('/')
  return { id: absence.id }
}

// ─────────────────────────────────────────────────────────────
// getMyAbsences
// Retourne les absences du collaborateur connecté.
// ─────────────────────────────────────────────────────────────

export async function getMyAbsences() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { absences: [] as Absence[] }

  const { data, error } = await supabase
    .from('absences')
    .select(`
      id, collaborateur_id, type, date_debut, date_fin_prevue, date_fin_reelle,
      mission_ou_client_concerne, niveau_de_risque, commentaire,
      declare_par, created_at,
      absences_documents(id, file_url, file_name, uploaded_at)
    `)
    .eq('collaborateur_id', user.id)
    .order('date_debut', { ascending: false })

  if (error) {
    console.error('Erreur getMyAbsences:', error)
    return { absences: [] as Absence[] }
  }

  return { absences: (data || []) as Absence[] }
}

// ─────────────────────────────────────────────────────────────
// getAbsencesByCollaborateur
// Utilisé par RH (pour un collaborateur donné) et par le Manager.
// La RLS garantit la portée selon le rôle.
// ─────────────────────────────────────────────────────────────

export async function getAbsencesByCollaborateur(collaborateurId: string) {
  const supabase = await createClient()
  const caller = await getCallerInfo(supabase)
  if (!caller) return { error: 'Non authentifié', absences: [] as Absence[] }

  // Vérification applicative : RH, ou manager de ce collaborateur
  if (!caller.isHR) {
    const ok = await isManagerOf(supabase, caller.userId, collaborateurId)
    if (!ok) return { error: 'Accès refusé.', absences: [] as Absence[] }
  }

  const { data, error } = await supabase
    .from('absences')
    .select(`
      id, collaborateur_id, type, date_debut, date_fin_prevue, date_fin_reelle,
      mission_ou_client_concerne, niveau_de_risque, commentaire,
      declare_par, created_at,
      absences_documents(id, file_url, file_name, uploaded_at)
    `)
    .eq('collaborateur_id', collaborateurId)
    .order('date_debut', { ascending: false })

  if (error) {
    console.error('Erreur getAbsencesByCollaborateur:', error)
    return { error: error.message, absences: [] as Absence[] }
  }

  return { absences: (data || []) as Absence[] }
}

// ─────────────────────────────────────────────────────────────
// recordCertificatUpload
// Enregistre un certificat uploadé dans absences_documents.
// Le fichier a déjà été envoyé dans le bucket côté client.
// ─────────────────────────────────────────────────────────────

export async function recordCertificatUpload(
  absenceId: string,
  fileUrl: string,
  fileName: string,
) {
  const supabase = await createClient()
  const caller = await getCallerInfo(supabase)
  if (!caller) return { error: 'Non authentifié' }

  // Vérifier que l'appelant a accès à cette absence (via RLS)
  const { data: absence } = await supabase
    .from('absences')
    .select('collaborateur_id')
    .eq('id', absenceId)
    .single()

  if (!absence) return { error: 'Absence introuvable ou accès refusé.' }

  // Un collaborateur ne peut uploader que pour ses propres absences
  if (!caller.isHR && absence.collaborateur_id !== caller.userId) {
    return { error: 'Accès refusé.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('absences_documents')
    .insert({
      absence_id: absenceId,
      file_url: fileUrl,
      file_name: fileName,
      uploaded_by: caller.userId,
    })

  if (error) {
    console.error('Erreur recordCertificatUpload:', error)
    return { error: "Erreur lors de l'enregistrement du certificat." }
  }

  revalidatePath('/')
  return { success: true }
}

// ─────────────────────────────────────────────────────────────
// getSignedCertificatUrl
// Génère une URL signée pour télécharger un certificat.
// VÉRIFIE les droits de l'appelant sur l'absence liée au fichier
// AVANT de signer l'URL. Jamais de lien signé sans autorisation.
// ─────────────────────────────────────────────────────────────

export async function getSignedCertificatUrl(fileUrl: string) {
  const supabase = await createClient()
  const caller = await getCallerInfo(supabase)
  if (!caller) return { error: 'Non authentifié' }

  // 1. Retrouver l'absence liée à ce fichier via la table de traçabilité
  const { data: doc } = await supabase
    .from('absences_documents')
    .select('absence_id, absences(collaborateur_id)')
    .eq('file_url', fileUrl)
    .single()

  if (!doc) return { error: 'Fichier introuvable.' }

  const collaborateurId = (doc.absences as any)?.collaborateur_id

  // 2. Vérifier les droits : soi-même, RH, ou manager de ce collaborateur
  if (!caller.isHR && collaborateurId !== caller.userId) {
    const ok = await isManagerOf(supabase, caller.userId, collaborateurId)
    if (!ok) return { error: 'Accès refusé.' }
  }

  // 3. Générer l'URL signée (1 heure)
  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('absences_documents')
    .createSignedUrl(fileUrl, 3600)

  if (error || !data?.signedUrl) {
    console.error('Erreur createSignedUrl:', error)
    return { error: 'Impossible de générer le lien de téléchargement.' }
  }

  return { signedUrl: data.signedUrl }
}

// ─────────────────────────────────────────────────────────────
// updateAbsenceManagerFields
// Mise à jour restreinte aux champs autorisés pour le Manager.
// Seuls niveau_de_risque, mission_ou_client_concerne, commentaire
// peuvent être modifiés ici — jamais les dates, le type, ni le collaborateur.
// Utilise adminClient (service_role) car la RLS Manager est SELECT-only.
// ─────────────────────────────────────────────────────────────

export async function updateAbsenceManagerFields(
  absenceId: string,
  fields: {
    niveau_de_risque?: NiveauRisque
    mission_ou_client_concerne?: string | null
    commentaire?: string | null
  }
) {
  const supabase = await createClient()
  const caller = await getCallerInfo(supabase)
  if (!caller) return { error: 'Non authentifié' }

  // Récupérer l'absence pour vérifier les droits
  const { data: absence } = await supabase
    .from('absences')
    .select('collaborateur_id')
    .eq('id', absenceId)
    .single()

  if (!absence) return { error: 'Absence introuvable ou accès refusé.' }

  // Vérification : RH, ou Manager du collaborateur lié à CETTE absence précise
  if (!caller.isHR) {
    const ok = await isManagerOf(supabase, caller.userId, absence.collaborateur_id)
    if (!ok) return { error: 'Accès refusé.' }
  }

  // Construire l'update en n'incluant QUE les 3 champs autorisés
  const allowedUpdate: Record<string, unknown> = {}
  if (fields.niveau_de_risque !== undefined) allowedUpdate.niveau_de_risque = fields.niveau_de_risque
  if (fields.mission_ou_client_concerne !== undefined) allowedUpdate.mission_ou_client_concerne = fields.mission_ou_client_concerne
  if (fields.commentaire !== undefined) allowedUpdate.commentaire = fields.commentaire

  if (Object.keys(allowedUpdate).length === 0) return { success: true }

  // UPDATE via service_role (bypass RLS) — les vérifications ci-dessus sont le filet de sécurité
  const admin = createAdminClient()
  const { error } = await admin
    .from('absences')
    .update(allowedUpdate)
    .eq('id', absenceId)

  if (error) {
    console.error('Erreur updateAbsenceManagerFields:', error)
    return { error: 'Erreur lors de la mise à jour.' }
  }

  revalidatePath('/')
  return { success: true }
}

// ─────────────────────────────────────────────────────────────
// getAbsencesDashboard
// Retourne toutes les absences avec profil du collaborateur,
// pour le tableau de bord RH/Manager.
// RH → tous les collaborateurs
// Manager → uniquement son équipe (via manager_id)
// ─────────────────────────────────────────────────────────────



export async function getAbsencesDashboard(): Promise<{
  rows: AbsenceDashboardRow[]
  userRole: 'hr' | 'manager'
  error?: string
}> {
  const supabase = await createClient()
  const caller = await getCallerInfo(supabase)
  if (!caller) return { rows: [], userRole: 'manager', error: 'Non authentifié' }

  // Construire la requête selon le rôle
  let query = supabase
    .from('absences')
    .select(`
      id, collaborateur_id, type, date_debut, date_fin_prevue, date_fin_reelle,
      mission_ou_client_concerne, niveau_de_risque, commentaire,
      declare_par, created_at,
      absences_documents(id, file_url, file_name, uploaded_at),
      collaborateur:profiles!absences_collaborateur_id_fkey(
        id, first_name, last_name, email, job_title, manager_id
      )
    `)
    .order('date_debut', { ascending: false })

  const { data, error } = await query

  if (error) {
    console.error('Erreur getAbsencesDashboard:', error)
    return { rows: [], userRole: caller.isHR ? 'hr' : 'manager', error: error.message }
  }

  // 2. Fetch managers manually because there is no foreign key self-relation for manager_id
  const managerIds = [...new Set((data || []).map((item: any) => item.collaborateur?.manager_id).filter(Boolean))] as string[]
  let managerMap = new Map<string, { first_name: string; last_name: string }>()
  if (managerIds.length > 0) {
    const { data: managersData } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', managerIds)
    if (managersData) {
      managersData.forEach(m => {
        managerMap.set(m.id, { first_name: m.first_name, last_name: m.last_name })
      })
    }
  }

  const rows: AbsenceDashboardRow[] = (data || []).map((item: any) => {
    const collab = item.collaborateur
    const mgr = collab?.manager_id ? managerMap.get(collab.manager_id) : null
    return {
      absence: {
        id: item.id,
        collaborateur_id: item.collaborateur_id,
        type: item.type,
        date_debut: item.date_debut,
        date_fin_prevue: item.date_fin_prevue,
        date_fin_reelle: item.date_fin_reelle,
        mission_ou_client_concerne: item.mission_ou_client_concerne,
        niveau_de_risque: item.niveau_de_risque,
        commentaire: item.commentaire,
        declare_par: item.declare_par,
        created_at: item.created_at,
        absences_documents: item.absences_documents || [],
      },
      collaborateur: {
        id: collab?.id ?? item.collaborateur_id,
        first_name: collab?.first_name ?? '',
        last_name: collab?.last_name ?? '',
        email: collab?.email ?? '',
        job_title: collab?.job_title ?? null,
        manager_id: collab?.manager_id ?? null,
        manager_first_name: mgr?.first_name ?? null,
        manager_last_name: mgr?.last_name ?? null,
      },
    }
  })

  return { rows, userRole: caller.isHR ? 'hr' : 'manager' }
}

// ─────────────────────────────────────────────────────────────
// cloturerAbsence
// Renseigne la date_fin_reelle pour marquer l'absence comme terminée.
// Autorisé : RH seulement (le Manager peut voir mais pas clôturer,
// c'est une décision RH). Si besoin d'ouvrir au Manager plus tard,
// il suffit d'ajouter la vérification isManagerOf.
// ─────────────────────────────────────────────────────────────

export async function cloturerAbsence(absenceId: string, dateFinReelle: string) {
  const supabase = await createClient()
  const caller = await getCallerInfo(supabase)
  if (!caller) return { error: 'Non authentifié' }

  if (!caller.isHR) {
    return { error: 'Seul le service RH peut clôturer une absence.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('absences')
    .update({ date_fin_reelle: dateFinReelle })
    .eq('id', absenceId)

  if (error) {
    console.error('Erreur cloturerAbsence:', error)
    return { error: 'Erreur lors de la clôture.' }
  }

  revalidatePath('/')
  return { success: true }
}
