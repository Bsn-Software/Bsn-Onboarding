'use client'

import { CheckCircle2, PenTool, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ModuleSignaturesData = {
  signature_collaborateur: string | null
  date_collaborateur: string | null
  signature_manager: string | null
  date_manager: string | null
}

interface ModuleSignaturesProps {
  value: ModuleSignaturesData
  onChange: (data: ModuleSignaturesData) => void
  readOnly?: boolean
  // Pour la démo : simuler le rôle de l'utilisateur courant
  roleSimule?: 'collaborateur' | 'manager' | 'admin'
  onReopen?: () => void
  onSign?: () => Promise<void>
}

export function initSignatures(): ModuleSignaturesData {
  return {
    signature_collaborateur: null,
    date_collaborateur: null,
    signature_manager: null,
    date_manager: null,
  }
}

// ─────────────────────────────────────────────────────────────
// Composant principal — Module 16
// ─────────────────────────────────────────────────────────────

export function ModuleSignatures({
  value,
  onChange,
  readOnly = false,
  roleSimule = 'manager', // Par défaut pour la démo
  onReopen,
  onSign,
}: ModuleSignaturesProps) {
  
  const [isSigning, setIsSigning] = useState(false)

  const handleSign = async (role: 'collaborateur' | 'manager') => {
    if (readOnly && !(roleSimule === 'admin')) return
    
    if (onSign) {
      setIsSigning(true)
      await onSign()
      setIsSigning(false)
    } else {
      // Fallback mode démo
      const now = new Date().toISOString()
      if (role === 'collaborateur') {
        onChange({
          ...value,
          signature_collaborateur: 'Signé numériquement',
          date_collaborateur: now,
        })
      } else {
        onChange({
          ...value,
          signature_manager: 'Signé numériquement',
          date_manager: now,
        })
      }
    }
  }

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  const isFormFullySigned = Boolean(value.signature_collaborateur && value.signature_manager)

  return (
    <div className={cn(
      "flex flex-col gap-5 rounded-xl border p-5 transition-colors",
      isFormFullySigned 
        ? "border-emerald-200 bg-emerald-50/30" 
        : "border-slate-200 bg-white"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-slate-900">Validation et Signatures</h3>
          <p className="text-xs text-slate-500">
            {isFormFullySigned 
              ? "L'entretien est clôturé. Le formulaire est en lecture seule."
              : "La signature électronique engage les deux parties sur le contenu de cet entretien."}
          </p>
        </div>
        
        {isFormFullySigned && onReopen && (
          <button
            onClick={onReopen}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            title="Action RH / Admin uniquement"
          >
            Ré-ouvrir l&apos;entretien (Admin)
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        
        {/* Signature Collaborateur */}
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-6 text-center">
          <h4 className="text-sm font-medium text-slate-800">Le Collaborateur</h4>
          
          {value.signature_collaborateur ? (
            <div className="flex flex-col items-center gap-1.5">
              <CheckCircle2 className="size-8 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-700">
                {value.signature_collaborateur}
              </p>
              <p className="text-xs text-slate-500">
                Le {formatDateTime(value.date_collaborateur!)}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs text-slate-500 max-w-[200px]">
                En attente de la signature du collaborateur.
              </p>
              <button
                onClick={() => handleSign('collaborateur')}
                disabled={isFormFullySigned || isSigning}
                className="flex items-center gap-2 rounded-lg bg-[#00b2de] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#009bc2] disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSigning ? <Loader2 className="size-4 animate-spin" /> : <PenTool className="size-4" />}
                Signer
              </button>
            </div>
          )}
        </div>

        {/* Signature Manager */}
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-6 text-center">
          <h4 className="text-sm font-medium text-slate-800">Le Manager</h4>
          
          {value.signature_manager ? (
            <div className="flex flex-col items-center gap-1.5">
              <CheckCircle2 className="size-8 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-700">
                {value.signature_manager}
              </p>
              <p className="text-xs text-slate-500">
                Le {formatDateTime(value.date_manager!)}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs text-slate-500 max-w-[200px]">
                En attente de la signature du manager.
              </p>
              <button
                onClick={() => handleSign('manager')}
                disabled={isFormFullySigned || isSigning}
                className="flex items-center gap-2 rounded-lg bg-[#00b2de] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#009bc2] disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSigning ? <Loader2 className="size-4 animate-spin" /> : <PenTool className="size-4" />}
                Signer
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
