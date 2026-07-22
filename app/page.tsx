import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CollaboratorView } from "@/components/dashboard/collaborator/collaborator-view"
import { DashboardShell } from "@/components/dashboard/layout/dashboard-shell"

export default async function Page() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Récupérer le profil
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, role, email')
    .eq('id', user.id)
    .single()

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.email || user.email || ''

  const currentUser = {
    name: fullName,
    role: profile?.role === 'hr' ? 'Admin RH' : 'Collaborateur',
    email: profile?.email || user.email || '',
  }

  // Collaborateurs → vue dédiée
  // La détection manager se fait en interne dans CollaboratorView (getManagerTeam)
  if (profile?.role === 'collaborator') {
    return <CollaboratorView user={currentUser} />
  }

  // RH → dashboard complet
  // isManagerOrHR = true pour les RH (toujours accès au dashboard EAD)
  return <DashboardShell user={currentUser} isManagerOrHR={true} />
}
