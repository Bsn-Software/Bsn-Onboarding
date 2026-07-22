'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Briefcase, Building2, Calendar, Loader2, Mail, User, UserPlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createCollaborator, getHRProfiles, sendInvitation } from '@/app/actions/collaborators'
import { toast } from 'sonner'

type HRProfile = { id: string; first_name: string | null; last_name: string | null; email: string }

type Props = {
  onClose: () => void
  onCreated: () => void
}

export function NewCollaboratorModal({ onClose, onCreated }: Props) {
  const [isPending, startTransition] = useTransition()
  const [hrProfiles, setHRProfiles] = useState<HRProfile[]>([])
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getHRProfiles().then(setHRProfiles)
    // Focus sur le premier champ à l'ouverture
    setTimeout(() => firstInputRef.current?.focus(), 50)
  }, [])

  // Fermer avec Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createCollaborator({
        first_name: fd.get('first_name') as string,
        last_name: fd.get('last_name') as string,
        email: fd.get('email') as string,
        job_title: fd.get('job_title') as string || undefined,
        bu: fd.get('bu') as string || undefined,
        entry_date: fd.get('entry_date') as string || undefined,
        manager_id: fd.get('manager_id') as string || undefined,
        is_headquarters: fd.get('is_headquarters') === 'on',
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        const sendInvite = fd.get('send_invitation') === 'on'
        if (sendInvite && result.collaboratorId && fd.get('email')) {
          const inviteResult = await sendInvitation(result.collaboratorId)
          if (inviteResult.error) {
            toast.error(`Dossier créé, mais erreur d'email : ${inviteResult.error}`)
          } else {
            toast.success('Dossier créé et invitation envoyée !')
          }
        } else {
          toast.success('Dossier créé avec succès !')
        }

        // Feedback SharePoint
        if (result.spFolderCreated) {
          toast.success('Dossier SharePoint créé ✓', {
            description: result.spFolderUrl
              ? `Collaborateurs/Onboarding/${fd.get('last_name')?.toString().toUpperCase()} ${fd.get('first_name')}`
              : undefined,
          })
        } else {
          toast.warning('Dossier SharePoint non créé', {
            description: 'Vérifiez les logs serveur pour plus de détails.',
          })
        }

        onCreated()
        onClose()
      }
    })
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#00b2de]/10">
                <UserPlus className="size-5 text-[#00b2de]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Nouveau collaborateur</h2>
                <p className="text-xs text-slate-500">Un lien magique pourra lui être envoyé.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            {/* Nom / Prénom */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Prénom <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    ref={firstInputRef}
                    name="first_name"
                    type="text"
                    required
                    placeholder="Léa"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#00b2de] focus:bg-white focus:ring-2 focus:ring-[#00b2de]/20 placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Nom <span className="text-red-400">*</span>
                </label>
                <input
                  name="last_name"
                  type="text"
                  required
                  placeholder="Martin"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#00b2de] focus:bg-white focus:ring-2 focus:ring-[#00b2de]/20 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Email professionnel
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  name="email"
                  type="email"
                  placeholder="Laisser vide si inconnu (ex: sera créé par l'IT)"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#00b2de] focus:bg-white focus:ring-2 focus:ring-[#00b2de]/20 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Poste + Date d'entrée */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Poste
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    name="job_title"
                    type="text"
                    placeholder="Développeur Front"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#00b2de] focus:bg-white focus:ring-2 focus:ring-[#00b2de]/20 placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Date d'entrée
                </label>
                <div 
                  className="relative cursor-pointer"
                  onClick={(e) => {
                    const input = e.currentTarget.querySelector('input')
                    if (input && 'showPicker' in input) {
                      try { input.showPicker() } catch (err) {}
                    }
                  }}
                >
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                  <input
                    name="entry_date"
                    type="date"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#00b2de] focus:bg-white focus:ring-2 focus:ring-[#00b2de]/20 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* BU */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Business Unit (BU)
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  name="bu"
                  type="text"
                  placeholder="ex: Digital, Industrie, Energy…"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#00b2de] focus:bg-white focus:ring-2 focus:ring-[#00b2de]/20 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Manager */}
            {hrProfiles.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Manager
                </label>
                <select
                  name="manager_id"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#00b2de] focus:bg-white focus:ring-2 focus:ring-[#00b2de]/20"
                >
                  <option value="">— Aucun manager —</option>
                  {hrProfiles.map(p => (
                    <option key={p.id} value={p.id}>
                      {[p.first_name, p.last_name].filter(Boolean).join(' ') || p.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Siège et Invitation */}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-slate-100 transition-colors">
                <input
                  name="is_headquarters"
                  type="checkbox"
                  className="size-4 accent-[#00b2de] rounded"
                />
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">Au siège</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-slate-100 transition-colors">
                <input
                  name="send_invitation"
                  type="checkbox"
                  defaultChecked
                  className="size-4 accent-[#00b2de] rounded"
                />
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">Invitation par email</span>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isPending}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition-all',
                  'bg-gradient-to-r from-[#00a0d1] to-[#00b2de] hover:from-[#0086b3] hover:to-[#0096c7] shadow-md shadow-[#00b2de]/20',
                  isPending && 'opacity-70 cursor-not-allowed'
                )}
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {isPending ? 'Création…' : 'Créer le dossier'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
