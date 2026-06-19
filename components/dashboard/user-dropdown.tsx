"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react"

import { cn } from "@/lib/utils"
import { InitialsAvatar } from "./initials-avatar"

type CurrentUser = {
  name: string
  role: string
  email: string
}

export function UserDropdown({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKey)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg py-1 pr-2 pl-1 text-left transition-colors outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
      >
        <InitialsAvatar name={user.name} />
        <span className="hidden flex-col leading-tight sm:flex">
          <span className="text-sm font-medium text-white">
            {user.name}
          </span>
          <span className="text-xs text-white/70">{user.role}</span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-white/70 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="flex items-center gap-3 border-b border-slate-200 px-3 py-3">
            <InitialsAvatar name={user.name} className="size-9 text-sm" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium text-slate-900">
                {user.name}
              </span>
              <span className="text-xs text-slate-500">
                {user.email}
              </span>
            </div>
          </div>
          <div className="p-1">
            <MenuItem icon={UserRound} label="Mon profil" />
            <MenuItem icon={Settings} label="Préférences" />
          </div>
          <div className="border-t border-slate-200 p-1">
            <MenuItem icon={LogOut} label="Se déconnecter" destructive />
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  icon: Icon,
  label,
  destructive,
}: {
  icon: typeof UserRound
  label: string
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#00b2de]",
        destructive
          ? "text-red-600 hover:bg-red-50"
          : "text-slate-700 hover:bg-slate-100",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}
