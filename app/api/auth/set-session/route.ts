import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)

  if (!body?.access_token || !body?.refresh_token) {
    return NextResponse.json({ error: 'Tokens manquants' }, { status: 400 })
  }

  // On vérifie si c'est un recovery pour renvoyer vers la bonne page
  const isRecovery = request.url.includes('type=recovery') || body.type === 'recovery'

  // On construit la réponse d'abord, puis on y attache les cookies.
  const response = NextResponse.json({ redirectTo: '/update-password' }) // On force sur update-password pour l'onboarding

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Lecture : cookies entrants de la requête
        getAll() {
          return request.cookies.getAll()
        },
        // Écriture : on pose les cookies sur la RÉPONSE, pas sur la requête
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.setSession({
    access_token: body.access_token,
    refresh_token: body.refresh_token,
  })

  if (error || !data.session) {
    return NextResponse.json(
      { error: error?.message ?? 'Session invalide' },
      { status: 401 }
    )
  }

  // À ce stade, \`response\` contient les headers Set-Cookie de Supabase SSR.
  // Le navigateur les appliquera dès la réception de cette réponse,
  // AVANT que window.location.replace() envoie la prochaine requête.
  return response
}