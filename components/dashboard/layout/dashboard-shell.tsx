"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { CollaboratorView } from "../collaborator/collaborator-view"
import { CollaboratorDetailView } from "../hr/collaborator-detail-view"
import { ContentArea } from "./content-area"
import { NAV_LABELS, STAFF_NAV } from "./nav-config"
import { StaffSidebar } from "./staff-sidebar"
import { Topbar } from "./topbar"
import { SettingsView } from "../hr/settings-view"

type ViewType = 'entrees' | 'sorties' | 'absences' | 'turnover' | 'ead' | 'parametres'

export function DashboardShell({
  user,
  isManagerOrHR = true,
}: {
  user: { name: string; role: string; email: string }
  isManagerOrHR?: boolean
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const initialTab = searchParams.get('tab') || STAFF_NAV[0].id
  
  const [activeId, setActiveId] = useState<string>(initialTab)
  const [activeView, setActiveView] = useState<ViewType>(initialTab as ViewType)
  const [isCollaboratorView, setIsCollaboratorView] = useState(false)
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null)

  // Mettre à jour l'URL (sans recharger) quand on change d'onglet
  // pour que le back/forward fonctionne et garde l'état
  const handleSelectTab = (id: string) => {
    setActiveId(id)
    setActiveView(id as ViewType)
    setSelectedCollaboratorId(null)
    router.replace(`/?tab=${id}`, { scroll: false })
  }

  if (isCollaboratorView) {
    return <CollaboratorView onBack={() => setIsCollaboratorView(false)} />
  }

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-slate-50 print:h-auto print:overflow-visible print:bg-white">
      <div className="print:hidden">
        <Topbar
          breadcrumb={NAV_LABELS[activeId]}
          user={user}
          onSwitchToCollaborator={() => setIsCollaboratorView(true)}
        />
      </div>
      <div className="flex flex-1 overflow-hidden print:overflow-visible">
        <div className="h-full print:hidden">
          <StaffSidebar activeId={activeId} isManagerOrHR={isManagerOrHR} onSelect={handleSelectTab} />
        </div>

        {activeView !== 'parametres' && (
          <div className="flex min-w-0 flex-1 flex-col print:overflow-visible">
            {/* Mobile tabs */}
            <nav
              aria-label="Navigation"
              className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden print:hidden"
            >
              {STAFF_NAV.filter(item => item.id !== 'ead' || isManagerOrHR).map((item) => {
                const isActive = item.id === activeId
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setActiveId(item.id); setActiveView(item.id as ViewType); }}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                      isActive
                        ? "bg-[#00b2de]/10 text-[#00b2de]"
                        : "text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </button>
                )
              })}
            </nav>

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 print:overflow-visible print:p-0 scrollbar-hide">
              {selectedCollaboratorId ? (
                <CollaboratorDetailView
                  checklistId={selectedCollaboratorId}
                  onBack={() => setSelectedCollaboratorId(null)}
                />
              ) : (
                <ContentArea activeId={activeId} onViewDetail={setSelectedCollaboratorId} />
              )}
            </main>
          </div>
        )}
        {activeView === 'parametres' && (
          <main className="flex min-w-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
            <SettingsView />
          </main>
        )}
      </div>
    </div>
  )
}
