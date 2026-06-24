'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.")
      return
    }

    setIsPending(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError("Erreur lors de la mise à jour : " + updateError.message)
      setIsPending(false)
      return
    }

    setSuccess(true)
    setIsPending(false)

    // Redirection après succès
    setTimeout(() => {
      router.push('/')
      router.refresh()
    }, 1500)
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* ── Colonne gauche : Formulaire ── */}
      <div className="flex flex-1 flex-col justify-center px-6 sm:px-10 lg:flex-none lg:w-[50%] xl:w-[45%] lg:border-r border-slate-100">
        <div className="mx-auto w-full max-w-sm">
          {/* Logo mobile */}
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
          <div className="mb-8 flex flex-col gap-1 animate-in fade-in slide-in-from-top-4 duration-500">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Sécurisez votre compte
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Veuillez définir votre mot de passe pour finaliser la création de votre accès BSN Engineering.
            </p>
          </div>

          {/* Formulaire */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both"
          >
            {/* Nouveau Password */}
            <div className="group flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-wider text-slate-600"
                >
                  Nouveau mot de passe
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
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-base text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#00b2de] focus:bg-white focus:ring-2 focus:ring-[#00b2de]/20"
                />
              </div>
            </div>

            {/* Confirmer Password */}
            <div className="group flex flex-col gap-2">
              <label
                htmlFor="confirmPassword"
                className="text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#00b2de]" />
                <input
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-base text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#00b2de] focus:bg-white focus:ring-2 focus:ring-[#00b2de]/20"
                />
              </div>
            </div>

            {/* Messages de retour */}
            {error && (
              <div
                role="alert"
                className="flex animate-in slide-in-from-top-2 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-sm font-medium text-red-600 duration-300"
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div
                role="alert"
                className="flex animate-in slide-in-from-top-2 items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-700 duration-300"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Mot de passe enregistré ! Redirection...
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={isPending || success}
              className={`group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-bold text-white shadow-lg outline-none transition-all focus-visible:ring-2 disabled:opacity-60 ${
                success 
                  ? "bg-emerald-500 shadow-emerald-500/20" 
                  : "bg-gradient-to-r from-[#00a0d1] to-[#00b2de] shadow-[#00b2de]/20 hover:from-[#0086b3] hover:to-[#0096c7] focus-visible:ring-[#00b2de] active:scale-[0.98]"
              }`}
            >
              {isPending ? 'Enregistrement…' : success ? 'Succès !' : 'Valider mon accès'}
              {!isPending && !success && (
                <ArrowRight className="h-4 w-4 opacity-70 transition-transform group-hover:translate-x-1" />
              )}
            </button>
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
        <div className="absolute inset-0 bg-gradient-to-br from-[#00b2de] via-[#0096c7] to-[#005f9e]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1504307651254-35680f356f58?q=80&w=2070&auto=format&fit=crop')",
          }}
        />
        <div className="absolute -right-32 -top-32 h-[500px] w-[500px] animate-pulse rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-10 left-10 h-[300px] w-[300px] rounded-full bg-[#00e5ff]/20 blur-3xl" />
        
        <div className="relative z-10 flex h-full w-full flex-col justify-center px-16 xl:px-24">
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
          <blockquote className="animate-in fade-in slide-in-from-right-8 fill-mode-both space-y-6 duration-1000 delay-300">
            <div className="mb-[-20px] text-6xl leading-none text-[#00e5ff]/50 blur-[1px]">"</div>
            <p className="text-3xl font-semibold leading-tight tracking-tight text-white/95 xl:text-4xl">
              Bienvenue dans l&apos;équipe.
            </p>
            <p className="text-lg font-medium leading-relaxed text-white/80 xl:text-xl">
              Votre aventure chez{' '}
              <strong className="font-bold text-white">BSN Engineering</strong>{' '}
              commence ici. Complétez votre profil en toute sécurité.
            </p>
          </blockquote>
        </div>
      </div>
    </div>
  )
}
