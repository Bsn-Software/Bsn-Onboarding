'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type AbsenceType =
  | 'maladie'
  | 'accident_travail'
  | 'conge_maternite'
  | 'conge_paternite'
  | 'autre'

export type NiveauRisque =
  | 'aucun'
  | 'remplacant_a_prevoir'
  | 'mission_en_danger'

export const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  maladie: 'Maladie',
  accident_travail: 'Accident du travail',
  conge_maternite: 'Congé maternité',
  conge_paternite: 'Congé paternité',
  autre: 'Autre',
}

export const NIVEAU_RISQUE_LABELS: Record<NiveauRisque, string> = {
  aucun: 'Aucun risque',
  remplacant_a_prevoir: 'Remplaçant à prévoir',
  mission_en_danger: 'Mission en danger',
}

export interface CreateAbsenceData {
  collaborateur_id: string
  type: AbsenceType
  date_debut: string
  date_fin_prevue?: string | null
  mission_ou_client_concerne?: string | null
  niveau_de_risque?: NiveauRisque
  commentaire?: string | null
}

export interface Absence {
  id: string
  collaborateur_id: string
  type: AbsenceType
  date_debut: string
  date_fin_prevue: string | null
  date_fin_reelle: string | null
  mission_ou_client_concerne: string | null
  niveau_de_risque: NiveauRisque
  commentaire: string | null
  declare_par: string
  created_at: string
  absences_documents: AbsenceDocument[]
}

export interface AbsenceDocument {
  id: string
  file_url: string
  file_name: string
  uploaded_at: string
}

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

  const { data: absence, error } = await supabase
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
