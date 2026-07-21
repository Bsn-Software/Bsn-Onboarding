// ─────────────────────────────────────────────────────────────
// Items des modules d'évaluation comportementale (Composant A)
// CDC §3, Modules 3, 4, 5
// ─────────────────────────────────────────────────────────────

import type { EadItemComportemental } from './bloc-evaluation-comportementale'

// ── Module 3 — Compétences générales (11 items) ──────────────
// CDC §3 : codes 1.1 → 1.11

export const ITEMS_MODULE_3: EadItemComportemental[] = [
  { code: '1.1',  libelle: "Sens du résultat, engagement personnel dans l'entreprise",  note: null },
  { code: '1.2',  libelle: "Adhésion à la culture d'entreprise",                         note: null },
  { code: '1.3',  libelle: "Gestion des priorités et des urgences",                      note: null },
  { code: '1.4',  libelle: "Application des règles / respect des directives",            note: null },
  { code: '1.5',  libelle: "Esprit d'équipe",                                            note: null },
  { code: '1.6',  libelle: "Capacité à s'adapter au changement / gestion du stress",     note: null },
  { code: '1.7',  libelle: "Autonomie et initiative",                                    note: null },
  { code: '1.8',  libelle: "Innovation / créativité",                                    note: null },
  { code: '1.9',  libelle: "Communication / Aisance relationnelle / Diplomatie",         note: null },
  { code: '1.10', libelle: "Respect des règles & consignes H&S",                        note: null },
  { code: '1.11', libelle: "Implication dans la démarche H&S",                          note: null },
]

// ── Module 4 — Sens du service / Relation client (6 items) ───
// CDC §3 : codes 2.1 → 2.6

export const ITEMS_MODULE_4: EadItemComportemental[] = [
  { code: '2.1', libelle: "Écoute, compréhension",                                                  note: null },
  { code: '2.2', libelle: "Apport de solution et de conseil, force de proposition",                 note: null },
  { code: '2.3', libelle: "Capacité à produire (livrables)",                                        note: null },
  { code: '2.4', libelle: "Respect des délais",                                                     note: null },
  { code: '2.5', libelle: "Disponibilité",                                                          note: null },
  { code: '2.6', libelle: "Remontée des informations sur de nouvelles affaires clients",            note: null },
]

// ── Module 5 — Expertise métier (4 items) ────────────────────
// CDC §3 : codes 3.1 → 3.4

export const ITEMS_MODULE_5: EadItemComportemental[] = [
  { code: '3.1', libelle: "Connaissance et pratique métier",                                         note: null },
  { code: '3.2', libelle: "Développement des compétences",                                           note: null },
  { code: '3.3', libelle: "Reconnaissance des compétences par l'entourage professionnel",            note: null },
  { code: '3.4', libelle: "Transmission des connaissances / retour d'expérience métier",             note: null },
]
