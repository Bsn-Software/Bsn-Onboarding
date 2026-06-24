'use client'

import { useEffect, useState } from 'react'

type Status = 'processing' | 'error'

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<Status>('processing')

  useEffect(() => {
    const handleImplicitCallback = async () => {
      const hash = window.location.hash
      if (!hash) {
        setStatus('error')
        return
      }

      const params = new URLSearchParams(hash.substring(1)) // retire le '#'
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')

      if (!access_token || !refresh_token) {
        setStatus('error')
        return
      }

      try {
        const res = await fetch('/api/auth/set-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin', // crucial : inclut les cookies existants
          body: JSON.stringify({ access_token, refresh_token }),
        })

        if (!res.ok) {
          throw new Error(`set-session failed: ${res.status}`)
        }

        const { redirectTo } = await res.json()

        // Redirection DURE (pas router.push) :
        // le navigateur envoie une nouvelle requête GET avec les cookies
        // déjà posés par la réponse du Route Handler ci-dessus.
        window.location.replace(redirectTo ?? '/dashboard')
      } catch (err) {
        console.error('[auth/callback]', err)
        setStatus('error')
      }
    }

    handleImplicitCallback()
  }, [])

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-100">
          Le lien est invalide ou a expiré. <a href="/login" className="underline font-bold ml-2">Retour à la connexion</a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm font-medium text-slate-600 animate-pulse">
          Connexion sécurisée en cours, veuillez patienter...
        </p>
      </div>
    </div>
  )
}
