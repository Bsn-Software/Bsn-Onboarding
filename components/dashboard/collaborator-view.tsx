"use client"

import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  UploadCloud,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { InitialsAvatar } from "./initials-avatar"

type DocStatus = "done" | "pending"

const DOCUMENTS: { id: string; label: string; hint: string; status: DocStatus }[] =
  [
    {
      id: "id",
      label: "Pièce d'identité",
      hint: "Carte d'identité ou passeport (recto/verso).",
      status: "done",
    },
    {
      id: "rib",
      label: "RIB",
      hint: "Relevé d'identité bancaire pour la paie.",
      status: "pending",
    },
    {
      id: "vitale",
      label: "Attestation de sécurité sociale",
      hint: "Attestation de droits ou carte Vitale.",
      status: "pending",
    },
    {
      id: "contrat",
      label: "Contrat signé",
      hint: "Votre contrat de travail signé.",
      status: "done",
    },
  ]

export function CollaboratorView({ onBack }: { onBack: () => void }) {
  const completed = DOCUMENTS.filter((doc) => doc.status === "done").length
  const total = DOCUMENTS.length
  const progress = Math.round((completed / total) * 100)

  return (
    <div className="flex min-h-svh flex-col bg-slate-50">
      {/* Minimal header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition-colors outline-none hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#00b2de]"
        >
          <ArrowLeft className="size-4" />
          Retour à l&apos;espace staff
        </button>
        <div className="flex items-center gap-2">
          <InitialsAvatar name="Léa Martin" />
          <span className="hidden text-sm font-medium text-slate-900 sm:inline">
            Léa Martin
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-slate-900 text-balance">
            Bienvenue, Léa.
          </h1>
          <p className="text-sm leading-relaxed text-slate-500 text-pretty">
            Pour finaliser votre arrivée, merci de déposer les documents
            ci-dessous. Vous pouvez les téléverser à tout moment.
          </p>
        </div>

        {/* Progress */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-900">
              Progression du dossier
            </span>
            <span className="text-slate-500">
              {completed}/{total} documents
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#00b2de] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Documents list */}
        <ul className="mt-6 flex flex-col gap-3">
          {DOCUMENTS.map((doc) => {
            const isDone = doc.status === "done"
            return (
              <li
                key={doc.id}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4"
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg",
                    isDone
                      ? "bg-[#00b2de]/10 text-[#00b2de]"
                      : "bg-slate-100 text-slate-400",
                  )}
                >
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {doc.label}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {doc.hint}
                  </p>
                </div>
                {isDone ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00b2de]/10 px-2.5 py-1 text-xs font-medium text-[#00b2de]">
                    <CheckCircle2 className="size-3.5" />
                    Reçu
                  </span>
                ) : (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#00b2de] px-3 py-1.5 text-xs font-medium text-white transition-colors outline-none hover:bg-[#00a0c8] focus-visible:ring-2 focus-visible:ring-[#00b2de]"
                  >
                    <UploadCloud className="size-3.5" />
                    Déposer
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <Clock className="size-3.5" />
          Vos documents sont traités sous 48h par l&apos;équipe RH.
        </p>
      </main>
    </div>
  )
}
