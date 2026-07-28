// Fichier de constantes partagées pour le module Absences
// Séparé de app/actions/absences.ts car 'use server' n'accepte que des fonctions async

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

export interface AbsenceDocument {
  id: string
  file_url: string
  file_name: string
  uploaded_at: string
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

export interface AbsenceDashboardRow {
  absence: Absence
  collaborateur: {
    id: string
    first_name: string
    last_name: string
    email: string
    job_title: string | null
    manager_id: string | null
    manager_first_name: string | null
    manager_last_name: string | null
  }
}
