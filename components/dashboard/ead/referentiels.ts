// ─────────────────────────────────────────────────────────────
// Référentiels EAD — données statiques à charger, pas à ressaisir
// CDC §4 : "Référentiels à seeder en base, pas à faire ressaisir"
// Ces constantes sont la source de vérité côté front.
// Elles correspondent aux seeds qui seront insérés en base à l'étape 6.
// ─────────────────────────────────────────────────────────────

export type RefItem = {
  id: string           // identifiant stable pour React key et pour la base
  libelle: string
  sous_libelle?: string // uniquement module 7 (CDC §3, module 7)
}

// ─────────────────────────────────────────────────────────────
// Module 6 — Connaissances techniques principales (53 items)
// CDC §3, Module 6
// ─────────────────────────────────────────────────────────────

export const MODULE_6_CONNAISSANCES_TECHNIQUES: RefItem[] = [
  { id: 'm6-01', libelle: 'Sûreté / Sécurité Nucléaire' },
  { id: 'm6-02', libelle: 'HSE' },
  { id: 'm6-03', libelle: 'Réglementaire pharma.' },
  { id: 'm6-04', libelle: 'Maîtrise des risques' },
  { id: 'm6-05', libelle: 'Incendie' },
  { id: 'm6-06', libelle: 'ATEX' },
  { id: 'm6-07', libelle: 'EPS' },
  { id: 'm6-08', libelle: 'Coordination Technique' },
  { id: 'm6-09', libelle: 'Conception générale' },
  { id: 'm6-10', libelle: 'Calculs Mécanique' },
  { id: 'm6-11', libelle: 'Radioprotection / Criticité' },
  { id: 'm6-12', libelle: 'Thermodynamique' },
  { id: 'm6-13', libelle: 'Aéraulique' },
  { id: 'm6-14', libelle: 'Structure' },
  { id: 'm6-15', libelle: 'Flex' },
  { id: 'm6-16', libelle: 'Infrastructure Génie Civil' },
  { id: 'm6-17', libelle: 'VRD' },
  { id: 'm6-18', libelle: 'Bâtiment' },
  { id: 'm6-19', libelle: 'Structure / Charpente' },
  { id: 'm6-20', libelle: 'Implantation / Manutention' },
  { id: 'm6-21', libelle: 'Tuyauterie / Install. Générales' },
  { id: 'm6-22', libelle: 'Fluides Utilités générales' },
  { id: 'm6-23', libelle: 'Utilités process' },
  { id: 'm6-24', libelle: 'HVAC' },
  { id: 'm6-25', libelle: 'Mécanique Conception' },
  { id: 'm6-26', libelle: 'Appareils sous pression' },
  { id: 'm6-27', libelle: 'Machines tournantes' },
  { id: 'm6-28', libelle: 'Isolateurs (BàG,...)' },
  { id: 'm6-29', libelle: 'Equipements de labo.' },
  { id: 'm6-30', libelle: 'Equipements industriels' },
  { id: 'm6-31', libelle: 'CFO/CFI Courants Forts' },
  { id: 'm6-32', libelle: 'Courants Faibles' },
  { id: 'm6-33', libelle: 'Instrumentation' },
  { id: 'm6-34', libelle: 'Info. Indus. Automatisme' },
  { id: 'm6-35', libelle: 'Contrôle Commande Informatique Industrielle' },
  { id: 'm6-36', libelle: 'Automatisme' },
  { id: 'm6-37', libelle: 'Simulation' },
  { id: 'm6-38', libelle: 'Intégration de systèmes' },
  { id: 'm6-39', libelle: 'Procédés Nucléaire' },
  { id: 'm6-40', libelle: 'Oil & Gaz' },
  { id: 'm6-41', libelle: 'Chimie' },
  { id: 'm6-42', libelle: 'Biotechnologies' },
  { id: 'm6-43', libelle: 'Traitement eaux et effluents' },
  { id: 'm6-44', libelle: 'Energie conventionnelle' },
  { id: 'm6-45', libelle: 'Process manufacturiers' },
  { id: 'm6-46', libelle: 'Orga. Production FMDS' },
  { id: 'm6-47', libelle: 'Logistique' },
  { id: 'm6-48', libelle: 'Simulation de flux' },
  { id: 'm6-49', libelle: 'Environnement Traitement Effluents liquides' },
  { id: 'm6-50', libelle: 'Traitement Effluents gazeux' },
  { id: 'm6-51', libelle: 'Dépollution des sols' },
  { id: 'm6-52', libelle: 'Energies renouvelables' },
  { id: 'm6-53', libelle: 'HQE (Hte Qual. Environn.)' },
]

// ─────────────────────────────────────────────────────────────
// Module 7 — Compétences Projet & Gestion (18 items)
// CDC §3, Module 7 — avec sous_libelle pour certaines lignes
// ─────────────────────────────────────────────────────────────

export const MODULE_7_COMPETENCES_PROJET: RefItem[] = [
  { id: 'm7-01', libelle: 'Projet',                           sous_libelle: 'Gestion de projet' },
  { id: 'm7-02', libelle: 'Planification' },
  { id: 'm7-03', libelle: 'Qualité' },
  { id: 'm7-04', libelle: 'Ingénieur Projet' },
  { id: 'm7-05', libelle: 'Gestion documentaire' },
  { id: 'm7-06', libelle: 'Coûts',                            sous_libelle: 'Estimations investissements' },
  { id: 'm7-07', libelle: 'Contrôle des coûts d\'investissement' },
  { id: 'm7-08', libelle: 'Achats',                           sous_libelle: 'Equipements' },
  { id: 'm7-09', libelle: 'Marchés' },
  { id: 'm7-10', libelle: 'Relance' },
  { id: 'm7-11', libelle: 'Inspection' },
  { id: 'm7-12', libelle: 'Construction',                     sous_libelle: 'Montage' },
  { id: 'm7-13', libelle: 'Coordination de chantier' },
  { id: 'm7-14', libelle: 'Essais / Mise en service' },
  { id: 'm7-15', libelle: 'Documentation',                    sous_libelle: 'Coordination documentaire' },
  { id: 'm7-16', libelle: 'Formation',                        sous_libelle: 'Conception' },
  { id: 'm7-17', libelle: 'Documentation',                    sous_libelle: 'Rédaction documentaire' },
  { id: 'm7-18', libelle: 'Formation',                        sous_libelle: 'Animation' },
]

// ─────────────────────────────────────────────────────────────
// Module 8 — Périmètres d'intervention (11 items)
// ─────────────────────────────────────────────────────────────

export const MODULE_8_PERIMETRES: RefItem[] = [
  { id: 'm8-01', libelle: 'Plan directeur' },
  { id: 'm8-02', libelle: 'Étude de faisabilité' },
  { id: 'm8-03', libelle: 'Avant Projet Sommaire' },
  { id: 'm8-04', libelle: 'Avant Projet Détaillé' },
  { id: 'm8-05', libelle: 'CDC - Consultation' },
  { id: 'm8-06', libelle: 'Études de réalisation' },
  { id: 'm8-07', libelle: 'Construction / Montage' },
  { id: 'm8-08', libelle: 'Essais / Mise en service' },
  { id: 'm8-09', libelle: 'Qualification / Validation' },
  { id: 'm8-10', libelle: 'Fiabilisation / Exploitation' },
  { id: 'm8-11', libelle: 'Démantèlement' },
]

// ─────────────────────────────────────────────────────────────
// Module 9 — Secteurs d'intervention (9 items)
// ─────────────────────────────────────────────────────────────

export const MODULE_9_SECTEURS: RefItem[] = [
  { id: 'm9-01', libelle: 'Énergie' },
  { id: 'm9-02', libelle: 'Secteur Nucléaire' },
  { id: 'm9-03', libelle: 'Industrie manufacturière' },
  { id: 'm9-04', libelle: 'Industrie pharmaceutique' },
  { id: 'm9-05', libelle: 'Industrie chimique' },
  { id: 'm9-06', libelle: 'Automobile' },
  { id: 'm9-07', libelle: 'Aéronautique' },
  { id: 'm9-08', libelle: 'Naval' },
  { id: 'm9-09', libelle: 'Défense' },
]
