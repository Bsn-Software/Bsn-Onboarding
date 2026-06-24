import { createClient } from '@supabase/supabase-js'

// ⚠️  Ce client utilise la SERVICE_ROLE_KEY — uniquement côté serveur
// Ne jamais exposer cette clé côté client (pas de NEXT_PUBLIC_)
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!url || !key) throw new Error('Variables Supabase manquantes côté serveur')

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
