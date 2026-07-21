import { HRTable } from '../hr/hr-table'
import { EadView } from '../ead/ead-view'
import { NAV_LABELS } from './nav-config'

export function ContentArea({ activeId, onViewDetail }: { activeId: string, onViewDetail?: (id: string) => void }) {
  if (activeId === 'entrees') {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-slate-900">Suivi RH — Checklist d'intégration</h1>
          <p className="text-sm text-slate-500">
            Suivez la progression de l'onboarding de chaque collaborateur.
          </p>
        </div>
        <HRTable onViewDetail={onViewDetail} phase="entry" />
      </div>
    )
  }

  if (activeId === 'sorties') {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-slate-900">Suivi RH — Offboarding</h1>
          <p className="text-sm text-slate-500">
            Gérez les départs et la restitution du matériel des collaborateurs.
          </p>
        </div>
        <HRTable onViewDetail={onViewDetail} phase="exit" />
      </div>
    )
  }

  if (activeId === 'ead') {
    return <EadView />
  }

  // Placeholder pour les autres onglets
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-slate-900">{NAV_LABELS[activeId] ?? 'Suivi'}</h1>
        <p className="text-sm text-slate-500">Cette section est en cours de développement.</p>
      </div>
      <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-20 text-slate-400">
        <p className="text-sm">Contenu à venir…</p>
      </div>
    </div>
  )
}
