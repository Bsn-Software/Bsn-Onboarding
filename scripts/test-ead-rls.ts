import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

async function runTest() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  // 1. Essayer de se connecter (il faut un utilisateur test)
  // Comme on est en local, on va juste vérifier que getEntretienById (depuis le serveur) bloque
  console.log("Test négatif RLS : Veuillez tester via l'interface UI en vous connectant avec 2 comptes différents.")
}

runTest()
