"use client"

import * as React from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DatePicker({
  date,
  setDate,
  disabled,
}: {
  date?: string
  setDate: (date: string) => void
  disabled?: boolean
}) {
  const parsedDate = date ? new Date(date) : undefined

  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-start text-left font-normal rounded-xl border border-slate-200 shadow-sm h-[42px] px-4 bg-white",
          "hover:border-[#00b2de]/50 hover:bg-white focus:ring-4 focus:ring-[#00b2de]/10 focus:border-[#00b2de]",
          !parsedDate && "text-slate-400",
          disabled && "bg-slate-50/50 hover:border-slate-200 cursor-not-allowed"
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
        {parsedDate ? (
          <span className="text-slate-900 font-medium">
            {format(parsedDate, "PPP", { locale: fr })}
          </span>
        ) : (
          <span>Sélectionner une date</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-2xl shadow-lg border-slate-200" align="start">
        <Calendar
          mode="single"
          selected={parsedDate}
          onSelect={(d) => {
            if (d) {
              // Convert to YYYY-MM-DD
              const tzOffset = d.getTimezoneOffset() * 60000; // offset in milliseconds
              const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 10);
              setDate(localISOTime)
            }
          }}
          locale={fr}
        />
      </PopoverContent>
    </Popover>
  )
}
