'use client'

import { useActionState, useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight, Lock, Mail, ShieldCheck } from 'lucide-react'
import { loginAction } from './actions'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [error, setError] = useState<string | null>(null)
  
  const [state, formAction, pending] = useActionState(loginAction, undefined)
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // Si l'URL contient une erreur Supabase (ex: lien expiré ou déjà utilisé)
    if (window.location.hash.includes('error=')) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const errorDesc = hashParams.get('error_description')
      setError(errorDesc ? decodeURIComponent(errorDesc).replace(/\+/g, ' ') : "Ce lien est invalide ou a déjà été utilisé.")
      // Nettoyer l'URL
      window.history.replaceState(null, '', window.location.pathname)
      return
    }

    // FALLBACK DE SÉCURITÉ :
    // Si Supabase a rejeté l'URL /auth/callback et redirigé vers l'accueil,
    // l'accueil (côté serveur) renvoie vers /login tout en gardant le hash dans l'URL.
    if (window.location.hash.includes('access_token')) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const isRecovery = hashParams.get('type') === 'recovery'

      if (accessToken && refreshToken) {
        setIsRedirecting(true)
        
        fetch('/api/auth/set-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken })
        })
        .then(res => {
          if (res.ok) {
            window.location.replace(isRecovery ? '/update-password' : '/')
          } else {
            setIsRedirecting(false)
          }
        })
        .catch(() => setIsRedirecting(false))
      }
    }
  }, [])

  useEffect(() => {
    if (state?.success) {
      router.refresh()
      router.push('/')
    }
  }, [state, router])

  if (isRedirecting) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <p className="text-sm font-medium text-slate-500 animate-pulse">
          Vérification de votre lien sécurisé...
        </p>
      </div>
    )
  }
  
  return (
    <div className="flex min-h-screen bg-white">

      {/* ── Colonne gauche : Formulaire ── */}
      <div className="flex w-full flex-col justify-center px-8 sm:px-12 md:w-1/2 lg:px-24 xl:px-32 relative">
        {error && (
          <div className="absolute top-8 left-8 right-8 rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100 flex items-center gap-2 animate-in slide-in-from-top-4">
            <ShieldCheck className="size-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}
        <div className="mx-auto w-full max-w-sm">

          {/* Logo mobile (caché sur desktop, la colonne droite l'affiche) */}
          <div className="mb-8 flex justify-center lg:hidden">
            <div className="flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3">
              <Image
                src="/logo-white.png"
                alt="BSN Engineering"
                width={160}
                height={48}
                className="h-10 w-auto object-contain"
                priority
              />
            </div>
          </div>

          {/* Titre */}
          <div
            className="mb-8 flex flex-col gap-1 animate-in fade-in slide-in-from-top-4 duration-500"
          >
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Bon retour
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Accédez à votre espace d'intégration ou de gestion RH.
            </p>
          </div>

          {/* Formulaire */}
          <form
            action={formAction}
            className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both"
          >
            {/* Email */}
            <div className="group flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#00b2de]" />
                <input
                  name="email"
                  autoComplete="email"
                  required
                  defaultValue=""
                  placeholder="prenom.nom@bsn-engineering.fr"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-base text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#00b2de] focus:bg-white focus:ring-2 focus:ring-[#00b2de]/20"
                />
              </div>
            </div>

            {/* Password */}
            <div className="group flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-wider text-slate-600"
                >
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-xs font-semibold text-[#00b2de] transition-colors hover:text-[#0096c7] hover:underline"
                >
                  {showPassword ? 'Masquer' : 'Afficher'}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#00b2de]" />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  defaultValue=""
                  placeholder="••••••••"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-base text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#00b2de] focus:bg-white focus:ring-2 focus:ring-[#00b2de]/20"
                />
              </div>
            </div>

            {/* Messages de retour */}
            {state?.error && (
              <div
                role="alert"
                className="flex animate-in slide-in-from-top-2 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-sm font-medium text-red-600 duration-300"
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                {state.error}
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={pending}
              className={cn(
                "group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-bold text-white shadow-lg outline-none transition-all focus-visible:ring-2 disabled:opacity-60",
                "bg-gradient-to-r from-[#00a0d1] to-[#00b2de] shadow-[#00b2de]/20 hover:from-[#0086b3] hover:to-[#0096c7] focus-visible:ring-[#00b2de] active:scale-[0.98]"
              )}
            >
              {pending ? 'Chargement…' : 'Se connecter'}
              {!pending && (
                <ArrowRight className="h-4 w-4 opacity-70 transition-transform group-hover:translate-x-1" />
              )}
            </button>

            {/* Support */}
            <p className="mt-2 text-center text-[13px] font-medium text-slate-500">
              Un problème de connexion ?{' '}
              <a
                href="mailto:contact@bsnengineering.com?subject=Problème connexion Espace RH"
                className="font-bold text-[#00a0d1] transition-colors hover:text-[#0086b3] hover:underline"
              >
                Contactez le support
              </a>
            </p>
          </form>

          {/* Footer sécurité */}
          <div className="mt-10 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-6">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-400">
              Plateforme sécurisée &amp; données chiffrées par{' '}
              <strong className="font-semibold">BSN Engineering</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── Colonne droite : Visuel BSN ── */}
      <div className="relative hidden overflow-hidden bg-[#00b2de] lg:flex lg:flex-1">
        {/* Gradient de profondeur */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#00b2de] via-[#0096c7] to-[#005f9e]" />

        {/* Photo fond industriel */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1504307651254-35680f356f58?q=80&w=2070&auto=format&fit=crop')",
          }}
        />

        {/* Formes glassmorphism */}
        <div className="absolute -right-32 -top-32 h-[500px] w-[500px] animate-pulse rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-10 left-10 h-[300px] w-[300px] rounded-full bg-[#00e5ff]/20 blur-3xl" />

        {/* Contenu */}
        <div className="relative z-10 flex h-full w-full flex-col justify-center px-16 xl:px-24">
          {/* Logo */}
          <div className="mb-12 animate-in fade-in slide-in-from-top-8 duration-1000">
            <Image
              src="/logo-white.png"
              alt="BSN Engineering"
              width={280}
              height={100}
              className="h-28 w-auto object-contain drop-shadow-lg sm:h-36"
              priority
            />
          </div>

          {/* Citation */}
          <blockquote className="animate-in fade-in slide-in-from-right-8 fill-mode-both space-y-6 duration-1000 delay-300">
            <div className="mb-[-20px] text-6xl leading-none text-[#00e5ff]/50 blur-[1px]">"</div>
            <p className="text-3xl font-semibold leading-tight tracking-tight text-white/95 xl:text-4xl">
              Simplifiez l&apos;intégration,<br />
              valorisez chaque talent.
            </p>
            <p className="text-lg font-medium leading-relaxed text-white/80 xl:text-xl">
              Avec l&apos;Espace RH{' '}
              <strong className="font-bold text-white">BSN Engineering</strong>,
              centralisez le suivi d&apos;onboarding, gérez les documents et
              accompagnez chaque collaborateur de l&apos;arrivée à la sortie.
            </p>
          </blockquote>
        </div>
      </div>
    </div>
  )
}
