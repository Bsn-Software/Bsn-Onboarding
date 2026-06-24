"use client"

import { ChevronRight, Eye, LayoutDashboard } from "lucide-react"
import { AppLauncher } from "@bsn-software/app-launcher"

import { UserDropdown } from "./user-dropdown"

type CurrentUser = {
  name: string
  role: string
  email: string
}

export function Topbar({
  breadcrumb,
  user,
  onSwitchToCollaborator,
}: {
  breadcrumb: string
  user: CurrentUser
  onSwitchToCollaborator: () => void
}) {
  return (
    <header className="flex h-22 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-[#00b2de] px-4 sm:px-6">
      {/* Brand & Breadcrumb */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-4 shrink-0">
          <AppLauncher align="start" apiUrl="https://portail-bsn.netlify.app/api/apps" />
          <div className="border-l border-white/20 pl-4 hidden sm:block">
            <img src="/logo-white.png" alt="BSN Logo" className="h-17 w-auto object-contain hover:scale-105 transition-transform duration-300" />
          </div>
        </div>

        {/* Separator to prevent "chaining" */}
        <div className="hidden md:block w-px h-6 bg-white/20 mx-2" aria-hidden="true" />

        <nav aria-label="Fil d'ariane" className="min-w-0 hidden md:block">
          <ol className="flex items-center gap-1.5 text-sm text-white/90">
            <li className="flex items-center gap-1.5 text-white/80">
              <LayoutDashboard className="size-4" />
              <span className="hidden sm:inline">Tableau de bord</span>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-4 text-white/50" />
            </li>
            <li className="truncate font-medium text-white">{breadcrumb}</li>
          </ol>
        </nav>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onSwitchToCollaborator}
          className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
        >
          <Eye className="size-4" />
          <span className="hidden md:inline">Vue collaborateur</span>
        </button>
        <div className="h-6 w-px bg-white/20" aria-hidden="true" />
        <UserDropdown user={user} />
      </div>
    </header>
  )
}
