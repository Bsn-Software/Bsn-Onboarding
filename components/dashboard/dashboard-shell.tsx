"use client"

import { useState } from "react"
import { ChevronRight, LayoutDashboard } from "lucide-react"

import { cn } from "@/lib/utils"
import { CollaboratorView } from "./collaborator-view"
import { ContentSkeleton } from "./content-skeleton"
import { NAV_LABELS, STAFF_NAV } from "./nav-config"
import { StaffSidebar } from "./staff-sidebar"
import { Topbar } from "./topbar"

const CURRENT_USER = {
  name: "Thomas Bernard",
  role: "Admin RH",
  email: "thomas.bernard@entreprise.fr",
}

export function DashboardShell() {
  const [activeId, setActiveId] = useState(STAFF_NAV[0].id)
  const [isCollaboratorView, setIsCollaboratorView] = useState(false)

  if (isCollaboratorView) {
    return <CollaboratorView onBack={() => setIsCollaboratorView(false)} />
  }

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-slate-50">
      <Topbar
        breadcrumb={NAV_LABELS[activeId]}
        user={CURRENT_USER}
        onSwitchToCollaborator={() => setIsCollaboratorView(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <StaffSidebar activeId={activeId} onSelect={setActiveId} />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile tabs */}
          <nav
            aria-label="Navigation"
            className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden"
          >
            {STAFF_NAV.map((item) => {
              const isActive = item.id === activeId
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
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

          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <ContentSkeleton activeId={activeId} />
          </main>
        </div>
      </div>
    </div>
  )
}
