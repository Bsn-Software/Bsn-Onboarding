'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface EadItemConfig {
  id: string
  item_code: string
  libelle: string | null        // null = utilise le libellé par défaut
  sous_libelle: string | null   // null = utilise le sous_libelle par défaut (Module 7 uniquement)
  actif: boolean
  updated_at: string
}

// ─────────────────────────────────────────────────────────────
// Helpers privés
// ─────────────────────────────────────────────────────────────

async function assertHR() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'hr') return null
  return user
}

// ─────────────────────────────────────────────────────────────
// getEadItemsConfig
// Retourne toutes les surcharges actives (sparse).
// Accessible par tous les authentifiés (collaborateurs voient
// leurs propres EAD avec les bons libellés).
// ─────────────────────────────────────────────────────────────

export async function getEadItemsConfig(): Promise<EadItemConfig[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ead_items_config')
    .select('id, item_code, libelle, sous_libelle, actif, updated_at')
    .order('item_code')

  if (error) {
    console.error('Erreur getEadItemsConfig:', error)
    return []
  }

  return (data || []) as EadItemConfig[]
}

// ─────────────────────────────────────────────────────────────
// upsertEadItemConfig
// Crée ou met à jour la surcharge d'un item.
// Autorisé : RH uniquement.
// ─────────────────────────────────────────────────────────────

export async function upsertEadItemConfig(
  itemCode: string,
  patch: { libelle?: string | null; sous_libelle?: string | null; actif?: boolean }
) {
  const user = await assertHR()
  if (!user) return { error: 'Accès refusé.' }

  const admin = createAdminClient()

  // Upsert sur le code (contrainte UNIQUE item_code)
  const { error } = await admin
    .from('ead_items_config')
    .upsert(
      {
        item_code: itemCode,
        libelle: patch.libelle ?? null,
        sous_libelle: patch.sous_libelle ?? null,
        actif: patch.actif ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'item_code' }
    )

  if (error) {
    console.error('Erreur upsertEadItemConfig:', error)
    return { error: 'Erreur lors de la sauvegarde.' }
  }

  revalidatePath('/')
  return { success: true }
}

// ─────────────────────────────────────────────────────────────
// resetEadItemConfig
// Supprime la surcharge d'un item (retour aux valeurs par défaut).
// Autorisé : RH uniquement.
// ─────────────────────────────────────────────────────────────

export async function resetEadItemConfig(itemCode: string) {
  const user = await assertHR()
  if (!user) return { error: 'Accès refusé.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('ead_items_config')
    .delete()
    .eq('item_code', itemCode)

  if (error) {
    console.error('Erreur resetEadItemConfig:', error)
    return { error: 'Erreur lors de la réinitialisation.' }
  }

  revalidatePath('/')
  return { success: true }
}
