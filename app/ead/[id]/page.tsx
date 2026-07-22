import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEntretienById } from '@/app/actions/ead'
import { EadPageClient } from './ead-page-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EadEntretienPage({ params }: Props) {
  const { id } = await params

  // Vérifier l'authentification
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Charger l'entretien — RLS active, bloque si non autorisé
  const res = await getEntretienById(id)

  if (res.error || !res.entretien) {
    // RLS a bloqué ou entretien inexistant → redirection silencieuse
    redirect('/')
  }

  return <EadPageClient entretienId={id} />
}
