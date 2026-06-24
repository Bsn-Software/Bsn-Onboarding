'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Veuillez remplir tous les champs.' }
  }

  const supabase = await createClient()

  console.log('--- DEBUG SERVER ACTION ---')
  console.log('URL utilisée:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('Clé utilisée:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10))

  // On fait l'appel côté serveur, ce qui contourne les problèmes de réseau/CORS du navigateur
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Erreur auth serveur:', error)
    return { error: 'Email ou mot de passe incorrect.' }
  }

  redirect('/')
}



