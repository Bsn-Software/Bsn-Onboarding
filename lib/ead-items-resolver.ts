// ─────────────────────────────────────────────────────────────
// EAD Items Resolver
// Fusionne les constantes TypeScript (source de vérité par défaut)
// avec les surcharges stockées dans ead_items_config (BDD).
//
// Principe sparse : si aucune ligne BDD pour un code → défaut TS.
// Utilisé :
//   - dans EadView au moment d'initialiser un NOUVEL entretien
//   - dans SettingsEadItems pour afficher l'état courant
// ─────────────────────────────────────────────────────────────

import type { EadItemConfig } from '@/app/actions/ead-config'
import type { RefItem } from '@/components/dashboard/ead/referentiels'
import type { EadItemComportemental } from '@/components/dashboard/ead/bloc-evaluation-comportementale'

// ─────────────────────────────────────────────────────────────
// Types exportés
// ─────────────────────────────────────────────────────────────

/** Map code → config (lookup O(1)) */
export type ConfigMap = Map<string, EadItemConfig>

/** Construit la Map à partir du tableau retourné par getEadItemsConfig() */
export function buildConfigMap(configs: EadItemConfig[]): ConfigMap {
  return new Map(configs.map(c => [c.item_code, c]))
}

// ─────────────────────────────────────────────────────────────
// Résolution des items comportementaux (Modules 3-5)
// code = '1.1', '2.3', etc.
// ─────────────────────────────────────────────────────────────

export function resolveComportementaux(
  items: EadItemComportemental[],
  configMap: ConfigMap
): EadItemComportemental[] {
  return items
    .filter(item => {
      const cfg = configMap.get(item.code)
      // Si pas de surcharge OU actif = true → item visible
      return cfg ? cfg.actif : true
    })
    .map(item => {
      const cfg = configMap.get(item.code)
      if (!cfg || cfg.libelle === null) return item
      return { ...item, libelle: cfg.libelle }
    })
}

// ─────────────────────────────────────────────────────────────
// Résolution des items de référentiel (Modules 6-9)
// id = 'm6-01', 'm7-03', etc.
// ─────────────────────────────────────────────────────────────

export function resolveReferentiel(
  items: RefItem[],
  configMap: ConfigMap
): RefItem[] {
  return items
    .filter(item => {
      const cfg = configMap.get(item.id)
      return cfg ? cfg.actif : true
    })
    .map(item => {
      const cfg = configMap.get(item.id)
      if (!cfg || cfg.libelle === null) return item
      return { ...item, libelle: cfg.libelle }
    })
}

// ─────────────────────────────────────────────────────────────
// Helpers pour l'UI des paramètres
// Retourne le libellé effectif (surchargé ou défaut) d'un item
// ─────────────────────────────────────────────────────────────

export function getEffectiveLibelle(
  defaultLibelle: string,
  code: string,
  configMap: ConfigMap
): string {
  const cfg = configMap.get(code)
  return cfg?.libelle ?? defaultLibelle
}

export function isItemActif(code: string, configMap: ConfigMap): boolean {
  const cfg = configMap.get(code)
  return cfg ? cfg.actif : true
}

export function isItemCustomized(code: string, configMap: ConfigMap): boolean {
  return configMap.has(code)
}
