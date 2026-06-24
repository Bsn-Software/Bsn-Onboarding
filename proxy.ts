import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Rafraîchit la session — ne pas supprimer cette ligne
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ✅ Laisser passer la page de callback et les routes /auth /api/auth sans vérification
  if (pathname.startsWith('/auth/') || pathname.startsWith('/api/auth/')) {
    return supabaseResponse
  }

  // Si non connecté et pas sur /login → redirect vers /login
  if (!user && pathname !== '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Si connecté et sur /login → redirect vers /
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Applique le proxy à toutes les routes sauf :
     * - _next/static (fichiers statiques)
     * - _next/image (images optimisées)
     * - favicon.ico, icônes, images publiques
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
