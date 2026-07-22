# Cahier des charges — Digitalisation du formulaire EAD (BSN Engineering)

> Document de travail à transmettre tel quel à l'agent (Antigravity). Il traduit le fichier Word `EAD_BSN_Engineering_modèle.docx` (8 pages) en une liste de modules fonctionnels, avec pour chacun les champs, leur type, leurs règles de comportement, et un schéma JSON. Objectif : que chaque module puisse être développé comme une tâche indépendante.

---

## 0. Contexte

Le fichier source est un formulaire papier/Word d'**entretien annuel (EAD)** rempli à deux (collaborateur + manager). Il est visuellement organisé en deux grandes parties, matérialisées dans le Word par des bandeaux latéraux de couleur (ce ne sont **pas** des champs à saisir, juste des repères visuels de section) :

- **« Collaborateur »** → évaluation comportementale/managériale (compétences générales, relation client, expertise métier).
- **« BSN Engineering »** → référentiel de compétences techniques propre au métier (connaissances techniques, gestion de projet, périmètres et secteurs d'intervention).

Puis viennent des blocs communs : bilan de l'année, objectifs N+1, souhaits d'évolution, mobilité, langues, plan de formation, signatures.

> **⚠️ Important : ce n'est pas une application autonome.** L'EAD est un **module d'une webapp RH "onboarding" existante**. Il doit donc s'intégrer à l'architecture déjà en place (stack technique, base de données, design system/UI kit, authentification et rôles, routing/navigation) plutôt que recréer sa propre fondation. Voir la nouvelle **Étape 0bis** de la feuille de route pour l'audit à faire en premier.

**Recommandation d'architecture web** : un formulaire multi-étapes (stepper/tabs) — un onglet par module ci-dessous — avec sauvegarde en brouillon à chaque étape, rattaché à un enregistrement unique `entretien` = 1 collaborateur × 1 année, **intégré dans la navigation existante de l'app d'onboarding** (ex: accessible depuis la fiche du collaborateur).

---

## 1. Vocabulaire des types de champs

Utilisé dans tout le document pour éviter de répéter la description à chaque fois :

| Type | Description |
|---|---|
| `text` | Champ texte court (une ligne) |
| `textarea` | Champ texte long (commentaire, plusieurs lignes) |
| `date` | Sélecteur de date |
| `number` | Champ numérique |
| `select` | Liste déroulante, choix unique |
| `note_echelle` | Note 4 / 3 / 2 / 1 / N-A (voir module 2) — à afficher en radio ou boutons, pas en liste déroulante, pour aller vite |
| `niveau_metier` | Niveau Junior / Confirmé / Senior / Expert (voir module 6) |
| `principal_secondaire` | Choix Principal / Secondaire |
| `checkbox` | Case à cocher simple |
| `checkbox_group` | Groupe de cases à cocher |
| `tri_state` | Oui / En partie / Non |
| `computed` | Champ calculé automatiquement, lecture seule |
| `repeatable_group` | Bloc dupliquable (bouton "ajouter une ligne") |
| `signature` | Capture de signature (dessin ou nom + horodatage) |

---

## 2. Composants réutilisables (à construire une seule fois)

C'est le point le plus important pour simplifier le travail : **la majorité du formulaire n'est que 2 composants répétés avec des listes différentes.** Les construire une fois, puis les réutiliser évite de recoder 7 tableaux quasi identiques.

### Composant A — `BlocEvaluationComportementale`
Utilisé par les modules 3, 4, 5 ("Compétences générales", "Sens du service", "Expertise métier").

Structure d'un bloc :
```json
{
  "titre": "Compétences générales",
  "moyenne": 3,                // computed, calculé sur les items notés (hors N/A)
  "items": [
    { "code": "1.1", "libelle": "Sens du résultat...", "note": null } // note_echelle : 4 | 3 | 2 | 1 | "NA" | null
  ],
  "commentaire": ""            // textarea
}
```
Légende affichée en en-tête de chaque bloc (statique, à afficher une fois, réutilisable) :
- **4** – Très bon, dépasse ses objectifs, montre l'exemple, transmet et diffuse son savoir-faire
- **3** – Bon, satisfait aux exigences du poste et a atteint tous les objectifs fixés
- **2** – Conforme, satisfait aux exigences du poste mais a besoin de progresser sur certains objectifs
- **1** – Insuffisant, répond en partie aux attentes du poste, plan de progrès à mettre en œuvre
- **N/A** – Non applicable, pour le poste ou trop récent pour l'évaluer

### Composant B — `LigneCompetenceTechnique`
Utilisé par les modules 6, 7, 8, 9 ("Connaissances techniques", "Compétences projet", "Périmètres", "Secteurs"). Chaque module = une liste d'items affichés dans un tableau avec toujours les 4 mêmes colonnes :

```json
{
  "libelle": "Sûreté / Sécurité Nucléaire",
  "sous_libelle": null,        // utilisé seulement au module 7 (ex: "Coûts" > "Estimations investissements")
  "nb_annees": null,           // number
  "principal_secondaire": null,// principal_secondaire
  "niveau": null,              // niveau_metier
  "commentaire": ""            // text
}
```
Légende des niveaux (statique, affichée une fois au-dessus du 1er tableau qui l'utilise) :
- **Junior** – Met en œuvre des connaissances acquises
- **Confirmé** – Autonome, met en œuvre des connaissances acquises lors d'une première expérience
- **Senior** – Possède son métier, peut encadrer une équipe ou un projet
- **Expert** – Référent sur son métier, fait face à des situations nouvelles, fait évoluer méthodes et techniques

---

## 3. Détail des modules

### Module 1 — En-tête / Identité
*(page 1, haut de page)*

> **À vérifier avant de coder ce module :** dans une webapp d'onboarding, une bonne partie de ces champs (Nom, Prénom, Société, BU, Fonction occupée, Date d'entrée, Email...) existe très probablement déjà sur la fiche du collaborateur créée pendant l'onboarding. Dans ce cas, ce module ne doit **pas** être un nouveau formulaire de saisie : il doit **pré-remplir en lecture seule** ces champs depuis le profil existant, et ne laisser en saisie que ce qui est propre à l'entretien (Date de l'entretien, Agence de rattachement, Coefficient, Position, Code Fonction, Nbre de personnes encadrées, Actuellement vous êtes — si ces derniers ne sont pas déjà stockés ailleurs).

| Champ | Type | Remarque |
|---|---|---|
| Logos | image statique | 2 logos à remplacer par les logos officiels |
| Secteur | `text` | |
| Agence de rattachement | `text` | |
| Nom | `text` | |
| Prénom | `text` | |
| Date de naissance | `date` | |
| Société | `text` | |
| BU | `text` | ou `select` si liste de BU connue |
| Fonction occupée | `text` | |
| Date d'entrée | `date` | |
| Nbre de personnes encadrées | `number` | |
| Coefficient | `text`/`number` | |
| Position | `text` | |
| Code Fonction | `text` | |
| Actuellement, vous êtes | `text` | libellé ambigu dans le doc source — à clarifier avec les RH (cf. section 6) |
| Email(s) | `text` | prévoir validation email, plusieurs valeurs possibles |
| Date de l'entretien | `date` | affiché en haut à droite dans le doc |

```json
"identite": {
  "secteur": "", "agence": "", "nom": "", "prenom": "", "date_naissance": "",
  "societe": "", "bu": "", "fonction": "", "date_entree": "",
  "nb_personnes_encadrees": null, "coefficient": "", "position": "",
  "code_fonction": "", "statut_actuel": "", "emails": [], "date_entretien": ""
}
```

### Module 2 — Grille d'évaluation (légende)
Bloc statique, purement informatif (voir légende dans le Composant A ci-dessus). Pas de saisie ici — juste un rappel affiché avant les modules 3 à 5.

### Module 3 — Compétences générales
*(section « Collaborateur »)* — instance du **Composant A**, 11 items :

1.1 Sens du résultat, engagement personnel dans l'entreprise · 1.2 Adhésion à la culture d'entreprise · 1.3 Gestion des priorités et des urgences · 1.4 Application des règles / respect des directives · 1.5 Esprit d'équipe · 1.6 Capacité à s'adapter au changement / gestion du stress · 1.7 Autonomie et initiative · 1.8 Innovation / créativité · 1.9 Communication / Aisance relationnelle / Diplomatie · 1.10 Respect des règles & consignes H&S · 1.11 Implication dans la démarche H&S

### Module 4 — Sens du service / Relation client (interne/externe)
Instance du **Composant A**, 6 items :

2.1 Écoute, compréhension · 2.2 Apport de solution et de conseil, force de proposition · 2.3 Capacité à produire (livrables) · 2.4 Respect des délais · 2.5 Disponibilité · 2.6 Remontée des informations sur de nouvelles affaires clients

### Module 5 — Expertise métier
Instance du **Composant A**, 4 items :

3.1 Connaissance et pratique métier · 3.2 Développement des compétences · 3.3 Reconnaissance des compétences par l'entourage professionnel · 3.4 Transmission des connaissances / retour d'expérience métier

### Module 6 — Connaissances techniques principales
*(section « BSN Engineering »)* — instance du **Composant B**, 53 items (liste de référence à charger telle quelle en base, pas à faire ressaisir) :

Sûreté / Sécurité Nucléaire, HSE, Réglementaire pharma., Maîtrise des risques, Incendie, ATEX, EPS, Coordination Technique, Conception générale, Calculs Mécanique, Radioprotection / Criticité, Thermodynamique, Aéraulique, Structure, Flex, Infrastructure Génie Civil, VRD, Bâtiment, Structure / Charpente, Implantation / Manutention, Tuyauterie / Install. Générales, Fluides Utilités générales, Utilités process, HVAC, Mécanique Conception, Appareils sous pression, Machines tournantes, Isolateurs (BàG,...), Equipements de labo., Equipements industriels, CFO/CFI Courants Forts, Courants Faibles, Instrumentation, Info. Indus. Automatisme, Contrôle Commande Informatique Industrielle, Automatisme, Simulation, Intégration de systèmes, Procédés Nucléaire, Oil & Gaz, Chimie, Biotechnologies, Traitement eaux et effluents, Energie conventionnelle, Process manufacturiers, Orga. Production FMDS, Logistique, Simulation de flux, Environnement Traitement Effluents liquides, Traitement Effluents gazeux, Dépollution des sols, Energies renouvelables, HQE (Hte Qual. Environn.)

### Module 7 — Compétences Projet & Gestion
Deuxième tableau « Métiers », instance du **Composant B** avec `sous_libelle` renseigné pour certaines lignes :

| Libellé | Sous-libellé |
|---|---|
| Projet | Gestion de projet |
| Planification | — |
| Qualité | — |
| Ingénieur Projet | — |
| Gestion documentaire | — |
| Coûts | Estimations investissements |
| Contrôle des coûts d'investissement | — |
| Achats | Equipements |
| Marchés | — |
| Relance | — |
| Inspection | — |
| Construction | Montage |
| Coordination de chantier | — |
| Essais / Mise en service | — |
| Documentation | Coordination documentaire |
| Formation | Conception |
| Documentation | Rédaction documentaire |
| Formation | Animation |

### Module 8 — Périmètres d'intervention
Instance du **Composant B**, 11 items : Plan directeur, Étude de faisabilité, Avant Projet Sommaire, Avant Projet Détaillé, CDC - Consultation, Études de réalisation, Construction / Montage, Essais / Mise en service, Qualification / Validation, Fiabilisation / Exploitation, Démantèlement.

### Module 9 — Secteurs d'intervention
Instance du **Composant B**, 9 items : Énergie, Secteur Nucléaire, Industrie manufacturière, Industrie pharmaceutique, Industrie chimique, Automobile, Aéronautique, Naval, Défense.

### Module 10 — Analyse des résultats de l'année
3 lignes fixes, chacune avec une évaluation `tri_state` + une remarque :

| Item | Atteint | Remarque |
|---|---|---|
| Objectifs | `tri_state` (Oui / En partie / Non) | `textarea` |
| Initiatives prises et innovation introduites dans le poste | `tri_state` | `textarea` |
| Évaluation de performance globale | `tri_state` | `textarea` |

```json
"bilan_annee": [
  { "item": "objectifs", "atteint": null, "remarque": "" },
  { "item": "initiatives_innovation", "atteint": null, "remarque": "" },
  { "item": "performance_globale", "atteint": null, "remarque": "" }
]
```

### Module 11 — Fixation des objectifs de l'année suivante
`repeatable_group` (3 lignes visibles dans le modèle, mais prévoir "ajouter une ligne" / "supprimer"). Colonnes par ligne :

| Colonne | Type |
|---|---|
| Objectif | `textarea` |
| L'objectif est atteint quand... | `textarea` |
| Moyens mis en œuvre pour les atteindre | `textarea` |

### Module 12 — Souhaits d'évolution
Deux champs texte côte à côte :

| Colonne | Type |
|---|---|
| Dans l'année | `textarea` |
| Sous 2 à 3 ans | `textarea` |

### Module 13 — Mobilité géographique (Filières)
- **Secteur France** — `checkbox_group` (choix multiple) : Est PACA, Ouest, Rhône Alpes, Sud-Ouest
- **International** — champ conditionnel : si l'utilisateur indique être intéressé par une mobilité internationale, afficher `checkbox_group` (22 pays) : Afrique du Sud, Belgique, Chine, Émirats Arabes Unis, États-Unis, Grande-Bretagne, Italie, Maroc, Portugal, Russie, Suisse, Allemagne, Brésil, Canada, Espagne, Finlande, Inde, Luxembourg, Pologne, Roumanie, Slovaquie, Turquie

### Module 14 — Langues
`checkbox_group` simple (pas de niveau associé dans le document source) : Français, Anglais, Allemand, Espagnol, Chinois, Autre(s) *(avec champ `text` libre si "Autre" coché)*.
> À challenger avec les RH : un niveau (A1→C2 ou Débutant/Courant/Bilingue) par langue serait probablement plus utile qu'une simple case à cocher — absent du document source, donc non imposé ici.

### Module 15 — Plan de formation
`repeatable_group` — chaque entrée = un besoin de formation identifié. Le modèle montre 3 exemples (anglais, Excel tableaux de bord, management d'équipe) qui illustrent le pattern à répéter :

| Champ | Type | Remarque |
|---|---|---|
| Domaine | `select` | ex: Compétences transversales, Management |
| Thème | `select` (dépendant du Domaine) | ex: Langues étrangères, Bureautique, Nouveaux managers |
| Stage / Titre | `text` (ou `select` si catalogue de formations disponible) | intitulé de la formation |
| Priorité | `select` | valeurs exactes à confirmer avec les RH |
| Justification | `textarea` | |
| Dans le cadre du... | `select`/`text` | contexte (ex: plan de développement individuel) — valeurs à confirmer |

```json
"plan_formation": [
  { "domaine": "", "theme": "", "stage": "", "priorite": "", "justification": "", "contexte": "" }
]
```

### Module 16 — Signatures & workflow
| Champ | Type |
|---|---|
| Signature Collaborateur | `signature` + date |
| Signature Manager | `signature` + date |

Comportement : une fois les deux signatures posées, le formulaire passe en **lecture seule** (aucune modification possible sans réouverture explicite par un RH/admin).

### Module 17 — Dashboard de suivi des EAD (vue RH / Manager)
*(ajouté après coup — c'est la vue d'ensemble RH, distincte du formulaire lui-même)*

Le formulaire (modules 1-16) est l'EAD **d'un** collaborateur. Ce module est la vue de **pilotage** pour RH/Manager : qui doit faire un EAD, qui l'a déjà fait, où en est chacun. Sans ce module, le seul point d'entrée est la fiche individuelle de chaque collaborateur — ce qui ne permet pas de piloter une campagne.

**Accès** : nouvelle entrée dans la navigation principale (pas seulement dans la fiche collaborateur). Vue RH = tous les collaborateurs. Vue Manager = uniquement son équipe (même filtre que la RLS déjà en place sur `manager_id`). Le rôle Collaborateur n'a pas accès à ce dashboard (il a déjà sa propre vue dans son profil).

| Colonne | Type | Remarque |
|---|---|---|
| Collaborateur (nom, prénom, fonction, BU) | affichage | |
| Manager | affichage | masqué en vue Manager, utile en vue RH |
| Statut EAD année en cours | badge calculé | Non commencé / Brouillon / En attente signature Manager / En attente signature Collaborateur / Terminé |
| Date du dernier EAD réalisé | `date` (lecture seule) | avec lien vers l'EAD archivé |
| Échéance | `date` éditable manuellement | **pas de calcul automatique pour l'instant — la règle métier n'est pas encore définie (voir section 6)** |
| Action rapide | bouton contextuel | "Créer l'EAD" / "Reprendre" / "Consulter" selon le statut |

Filtres : par statut, par BU, par Manager (vue RH), par année. Compteurs synthétiques en haut de page (non commencés / en cours / terminés).

```json
"dashboard_ead": [
  {
    "collaborateur_id": "",
    "statut_annee_courante": "non_commence | brouillon | attente_signature_manager | attente_signature_collaborateur | termine",
    "date_dernier_ead": null,
    "date_echeance": null,
    "entretien_id_courant": null
  }
]
```

---

## 4. Règles transverses

- **Rôles** : `Collaborateur` (remplit son auto-évaluation, ses souhaits, ses vœux de mobilité/langues) et `Manager` (remplit la grille de notation, le bilan, fixe les objectifs). À confirmer avec le métier qui remplit exactement quoi — le document papier ne le précise pas explicitement, il est pensé pour être rempli **ensemble** pendant l'entretien.
- **Un enregistrement = un collaborateur × une année.** Prévoir un historique consultable des EAD des années précédentes.
- **Calcul automatique** de la "Moyenne" sur chaque bloc du Composant A (moyenne des notes numériques saisies, en excluant les "N/A" et les items non notés).
- **Sauvegarde en brouillon** à chaque étape (le formulaire est long — ne pas obliger à tout remplir en une seule session).
- **Export PDF** du formulaire rempli et signé, pour archivage RH (probablement une exigence implicite vu qu'il s'agit d'un document RH signé).
- **Référentiels à seeder en base**, pas à faire ressaisir par les utilisateurs : liste des 53 compétences techniques (module 6), liste des items des modules 7/8/9, liste des 22 pays (module 13).

## 5. Modèle de données global (vue d'ensemble)

```json
{
  "entretien": {
    "annee": 2026,
    "statut": "brouillon | soumis | signe",
    "identite": { "...": "voir module 1" },
    "evaluation": {
      "competences_generales": { "...": "Composant A" },
      "sens_du_service": { "...": "Composant A" },
      "expertise_metier": { "...": "Composant A" }
    },
    "referentiel_technique": {
      "connaissances_techniques": [ "...Composant B x53" ],
      "competences_projet": [ "...Composant B x18" ],
      "perimetres_intervention": [ "...Composant B x11" ],
      "secteurs_intervention": [ "...Composant B x9" ]
    },
    "bilan_annee": [ "...voir module 10" ],
    "objectifs_annee_suivante": [ "...voir module 11" ],
    "souhaits_evolution": { "dans_annee": "", "sous_2_3_ans": "" },
    "mobilite": { "france": [], "international": [] },
    "langues": [],
    "plan_formation": [ "...voir module 15" ],
    "signatures": { "collaborateur": null, "manager": null }
  }
}
```

## 6. Points à clarifier avant de coder

- **Règle métier de l'échéance d'un EAD** (module 17) : campagne annuelle à date fixe, date anniversaire d'entrée, ou décision au cas par cas par RH/Manager ? Tant que ce n'est pas tranché, le champ reste manuel — voir module 17.
- **La fiche collaborateur (module 1) existe-t-elle déjà dans la webapp d'onboarding ?** Si oui, quels champs exactement, et sous quel format/API — pour pré-remplir plutôt que ressaisir (voir note du module 1).
- Le design system / bibliothèque de composants de la webapp d'onboarding existe déjà : à réutiliser pour tous les modules (boutons, champs, tableaux) plutôt qu'en créer un nouveau.
- Comment l'authentification et les rôles (Collaborateur/Manager/RH) sont-ils déjà gérés dans l'app existante ? Le module EAD doit s'y brancher, pas créer son propre système.
- Sens exact du champ **"Actuellement, vous êtes :"** (statut du poste ? mobilité en cours ? à confirmer).
- Qui remplit quoi exactement (Collaborateur vs Manager) et à quel moment du processus.
- Valeurs précises attendues pour **Priorité** et **"Dans le cadre du..."** dans le plan de formation.
- Faut-il un niveau par langue (module 14) plutôt qu'une simple case à cocher ?
- Faut-il gérer un catalogue de formations existant (module 15) ou laisser un champ libre ?
- Contrainte légale/RH sur la signature électronique (simple confirmation par nom, ou signature dessinée type DocuSign) ?

---

## 7. Découpage suggéré en tickets de développement

0. **Audit de l'existant** : stack technique, modèle de données "collaborateur", design system/UI kit, routing, auth & rôles déjà en place dans la webapp d'onboarding — avant tout code
1. `NoteEchelle` + `NiveauMetier` — composants de saisie réutilisables (boutons/radio), avec les composants du design system existant
2. `BlocEvaluationComportementale` (Composant A) — avec calcul automatique de moyenne
3. `LigneCompetenceTechnique` / tableau (Composant B) — avec chargement de listes de référence
4. Écran **Identité** (module 1) — pré-rempli depuis la fiche collaborateur existante, complété par les champs propres à l'entretien
5. Assemblage modules 3-5 (Compétences générales / Service / Expertise) via Composant A
6. Assemblage modules 6-9 (référentiel technique BSN Engineering) via Composant B + seed des référentiels
7. Bloc **Bilan de l'année** + **Objectifs N+1** (modules 10-11, avec lignes dynamiques)
8. Bloc **Souhaits / Mobilité / Langues** (modules 12-14)
9. Bloc **Plan de formation** (module 15, listes en cascade Domaine → Thème)
10. **Signatures & workflow** (module 16) : verrouillage du formulaire après double signature
11. **Export PDF** de l'entretien rempli
12. Backend : modèle de données et API CRUD pour l'entretien, **intégrés à la base et à l'authentification déjà existantes** de la webapp d'onboarding (pas de nouveau système d'auth), historique par année
13. **Dashboard de suivi des EAD** (module 17) : nouvelle entrée de navigation, vue RH (tous) / vue Manager (son équipe), statuts, échéance en champ manuel pour l'instant
