# Cahier des charges — Suivi des absences longue durée (consultants)

> Module distinct de l'EAD, même webapp. À transmettre à Antigravity avec le même principe : audit de l'existant d'abord, puis étapes une par une.

---

## 0. Contexte & objectif

Société de prestation (consultants en mission chez des clients). Une absence longue (maladie, accident...) d'un consultant en mission peut mettre en péril la mission chez le client si aucun remplaçant n'est trouvé à temps. Objectif v1 :

1. Permettre à un **collaborateur** ou aux **RH** de déclarer une absence, avec un certificat.
2. Donner à **RH et Manager** une vue de suivi des absences en cours et de leur impact potentiel sur les missions.
3. **Hors scope pour l'instant** : l'envoi automatique d'un email au client pour l'informer de l'absence — prévu comme évolution future (partie 5). On conçoit le modèle de données pour que ce soit facile à brancher plus tard, mais on ne le construit pas maintenant.

## 1. Décisions déjà tranchées

- **Pas de seuil de durée** : n'importe quelle absence peut être déclarée dans l'outil, pas seulement les "longues". C'est le suivi de l'impact (mission à risque) qui fait la différence, pas une règle de durée minimale.
- **Visibilité** : RH et Manager voient tous les deux le motif complet et le certificat. Le collaborateur ne voit que ses propres déclarations.
- **Qui peut déclarer une absence** : le collaborateur concerné, ou RH (au nom du collaborateur). *(Le Manager n'a pas été mentionné comme pouvant déclarer — à confirmer si besoin, facile à ouvrir plus tard.)*

> **Note RGPD, pas bloquante mais à garder en tête** : le motif d'absence (maladie...) est une donnée de santé, catégorie particulière de données personnelles. Même avec un accès large (RH+Manager), ça vaut le coup de vérifier avec vos RH la durée de conservation et si un journal d'accès (qui a consulté quoi) est nécessaire — comme pour la valeur légale de la signature EAD, ce n'est pas un sujet technique à trancher seul.

## 2. Modèle de données

Table `absences` :

| Champ | Type | Remarque |
|---|---|---|
| collaborateur_id | FK | |
| type | `select` | Maladie, Accident du travail, Congé maternité, Congé paternité, Autre |
| date_debut | `date` | |
| date_fin_prevue | `date`, nullable | "durée indéterminée" si non renseignée |
| date_fin_reelle | `date`, nullable | renseignée au retour du collaborateur, sert à clôturer |
| statut | calculé | "En cours" si `date_fin_reelle` est nulle, "Terminée" sinon |
| certificat | fichier | réutiliser le système de documents existant de l'app (à vérifier — voir audit) |
| certificat_statut | calculé | "Fourni" / "En attente" — utile pour que RH relance |
| mission_ou_client_concerne | `text` (ou lien vers une mission existante si ce concept existe déjà — voir audit) | |
| niveau_de_risque | `select` | Aucun risque / Remplaçant à prévoir / Mission en danger — *proposition, à valider avec toi, pas explicitement demandé mais utile vu le contexte que tu as décrit* |
| commentaire | `textarea` | RH/Manager |
| declare_par | FK (collaborateur ou RH) + date | traçabilité de qui a fait la déclaration |

## 3. Écrans

### 3.1 Déclaration d'absence
Formulaire accessible :
- Côté **Collaborateur** : depuis son propre espace, "Déclarer une absence".
- Côté **RH** : depuis la fiche d'un collaborateur, "Déclarer une absence pour ce collaborateur".

Champs : type, date de début, date de fin prévue (optionnelle), upload du certificat (optionnel à la déclaration — peut être ajouté après coup si pas encore en main), commentaire.

### 3.2 Dashboard de suivi (vue RH / Manager)
Sur le même principe que le dashboard EAD (module 17 de l'autre document) :

| Colonne | Remarque |
|---|---|
| Collaborateur | |
| Manager | masqué en vue Manager |
| Type | |
| Dates (début → fin prévue/réelle) | |
| Statut | En cours / Terminée |
| Certificat | Fourni / En attente |
| Mission / Client concerné | |
| Niveau de risque | badge coloré |
| Actions | Modifier, Clôturer (renseigner date de fin réelle), Consulter |

Vue RH = tous les collaborateurs. Vue Manager = son équipe uniquement (même filtre `manager_id` que le reste de l'app). Filtres : statut, type, niveau de risque. Compteurs en haut : absences en cours, missions à risque.

## 4. Ce qu'on ne construit pas maintenant (mais qu'on prépare)

- **Email automatique au client** en cas d'absence longue. Le champ `mission_ou_client_concerne` est là pour permettre de brancher ça plus tard sans redesign. Quand vous serez prêts, il faudra définir : quel déclencheur (dès la déclaration ? seulement si "Mission en danger" ? après X jours ?), quel contenu (on ne veut sûrement pas révéler le motif médical au client), qui valide l'envoi avant qu'il parte.

## 5. Points à clarifier avant de coder

- Est-ce que l'app a déjà une notion de "mission" / "client" par collaborateur (dates de mission, nom du client) ? Ça détermine si `mission_ou_client_concerne` est un vrai lien vers une donnée existante ou juste un champ texte libre pour l'instant.
- Le champ `niveau_de_risque` est une proposition de ma part, pas une demande explicite — à valider ou retirer.
- Le Manager doit-il aussi pouvoir déclarer une absence pour un membre de son équipe, ou seulement RH et le collaborateur lui-même ?

---

## Feuille de route — étapes à donner à Antigravity

### Étape A — Audit
> Avant de coder le module "Suivi des absences", explore le projet et dis-moi : (1) Existe-t-il déjà une notion de "mission" ou "client" rattachée à un collaborateur (table, champs) ? (2) Comment sont gérés les uploads de documents actuellement (je sais qu'il y a déjà `documents.ts` — précise le pattern utilisé, bucket de storage, etc.) pour que je réutilise la même chose pour le certificat. Ne code rien, donne-moi juste ce résumé.

### Étape B — Modèle de données + déclaration d'absence
> Étape B : crée la table `absences` (voir section 2 du cahier des charges "Suivi des absences"). Développe le formulaire de déclaration (section 3.1), accessible côté Collaborateur (pour soi-même) et côté RH (pour un collaborateur donné), avec upload du certificat en réutilisant le système de documents existant identifié à l'étape A.

### Étape C — Dashboard de suivi
> Étape C : développe le dashboard de suivi des absences (section 3.2) : vue RH (tous les collaborateurs) et vue Manager (son équipe uniquement, même filtre `manager_id` que le dashboard EAD). Colonnes, filtres et compteurs comme décrits. Action "Clôturer" pour renseigner la date de fin réelle et repasser le statut à "Terminée".
