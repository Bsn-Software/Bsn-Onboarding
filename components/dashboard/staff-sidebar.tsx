"use client"

import { LifeBuoy, Settings, Users } from "lucide-react"

import { cn } from "@/lib/utils"
import { STAFF_NAV } from "./nav-config"

export function StaffSidebar({
  activeId,
  onSelect,
}: {
  activeId: string
  onSelect: (id: string) => void
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigation principale">
        <p className="px-2 pb-2 text-xs font-medium tracking-wide text-slate-400 uppercase">
          Suivi
        </p>
        <ul className="flex flex-col gap-1">
          {STAFF_NAV.map((item) => {
            const Icon = item.icon
            const isActive = item.id === activeId
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#00b2de]",
                    isActive
                      ? "bg-[#00b2de]/10 text-[#00b2de]"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      isActive ? "text-[#00b2de]" : "text-slate-400",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 p-3">
        <ul className="flex flex-col gap-1">
          <li>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors outline-none hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#00b2de]"
            >
              <LifeBuoy className="size-4 shrink-0" />
              <span>Aide &amp; support</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors outline-none hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#00b2de]"
            >
              <Settings className="size-4 shrink-0" />
              <span>Paramètres</span>
            </button>
          </li>
        </ul>
      </div>
    </aside>
  )
}
