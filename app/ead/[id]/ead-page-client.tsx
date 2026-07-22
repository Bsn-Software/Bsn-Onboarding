'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { EadView } from '@/components/dashboard/ead/ead-view'

export function EadPageClient({ entretienId }: { entretienId: string }) {
  const router = useRouter()

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-slate-50">
      {/* Topbar de navigation */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 shadow-sm print:hidden">
        <button
          onClick={() => router.push('/?tab=ead')}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Retour au dashboard EAD
        </button>
        <span className="h-4 w-px bg-slate-200" aria-hidden />
        <span className="text-sm font-semibold text-slate-900">
          Entretien Annuel de Développement
        </span>
      </header>

      {/* Contenu de l'entretien */}
      <div className="flex-1 overflow-y-auto scrollbar-hide mt-5 mb-5">
        <EadView
          entretienId={entretienId}
          onBack={() => router.push('/?tab=ead')}
        />
      </div>
    </div>
  )
}
