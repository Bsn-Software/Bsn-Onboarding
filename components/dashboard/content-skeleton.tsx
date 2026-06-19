import { cn } from "@/lib/utils"
import { NAV_LABELS } from "./nav-config"

function Bar({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-slate-100", className)} />
  )
}

export function ContentSkeleton({ activeId }: { activeId: string }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-slate-900 text-balance">
          {NAV_LABELS[activeId] ?? "Suivi"}
        </h1>
        <p className="text-sm text-slate-500">
          Vue d&apos;ensemble des dossiers et de leur avancement.
        </p>
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <Bar className="h-3 w-24" />
            <Bar className="h-7 w-16" />
            <Bar className="h-2.5 w-full" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <Bar className="h-4 w-40" />
          <Bar className="h-8 w-28" />
        </div>
        <div className="flex flex-col">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 border-b border-slate-200 px-4 py-3 last:border-0"
            >
              <div className="size-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
              <Bar className="h-3.5 w-40" />
              <Bar className="ml-auto h-3.5 w-24" />
              <Bar className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
