'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ClipboardList, FileDown, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { getEntretienById, upsertEntretien, signEntretien } from '@/app/actions/ead'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  SectionEvaluationComportementale,
  initEvaluationComportementale,
  type EvaluationComportementaleData,
} from '../ead/section-evaluation-comportementale'
import {
  SectionReferentielTechnique,
  initReferentielTechnique,
  type ReferentielTechniqueData,
} from '../ead/section-referentiel-technique'
import {
  ModuleIdentite,
  initIdentiteSaisie,
  type ModuleIdentiteData,
  type IdentiteSaisie,
} from '../ead/module-identite'
import {
  ModuleBilanAnnee,
  initBilanAnnee,
  type ModuleBilanAnneeData,
} from '../ead/module-bilan-annee'
import {
  ModuleObjectifsSuivants,
  initObjectifsSuivants,
  type ModuleObjectifsSuivantsData,
} from '../ead/module-objectifs-suivants'
import {
  ModuleEvolution,
  initEvolution,
  type ModuleEvolutionData,
} from '../ead/module-evolution'
import {
  ModuleMobilite,
  initMobilite,
  type ModuleMobiliteData,
} from '../ead/module-mobilite'
import {
  ModuleLangues,
  initLangues,
  type ModuleLanguesData,
} from '../ead/module-langues'
import {
  ModuleFormation,
  initPlanFormation,
  type ModuleFormationData,
} from '../ead/module-formation'
import {
  ModuleSignatures,
  initSignatures,
  type ModuleSignaturesData,
} from '../ead/module-signatures'

// Plus besoin de DEMO_READ_ONLY puisque les champs sont modifiables et préremplis depuis la BDD.

// ─────────────────────────────────────────────────────────────
// Page Suivi EAD Dynamique
// ─────────────────────────────────────────────────────────────

export function EadView({ entretienId, onBack }: { entretienId?: string, onBack?: () => void }) {
  const [loading, setLoading] = useState(!!entretienId)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [activeTab, setActiveTab] = useState('identite')
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Module 1 — Identité
  const [identite, setIdentite] = useState<IdentiteSaisie>(initIdentiteSaisie())

  // Modules 3, 4, 5 — Section Évaluation comportementale
  const [evaluation, setEvaluation] = useState<EvaluationComportementaleData>(
    initEvaluationComportementale()
  )

  // Modules 6, 7, 8, 9 — Section Référentiel technique
  const [referentiel, setReferentiel] = useState<ReferentielTechniqueData>(
    initReferentielTechnique()
  )

  // Module 10 — Bilan de l'année
  const [bilan, setBilan] = useState<ModuleBilanAnneeData>(
    initBilanAnnee()
  )

  // Module 11 — Objectifs de l'année suivante
  const [objectifs, setObjectifs] = useState<ModuleObjectifsSuivantsData>(
    initObjectifsSuivants()
  )

  // Module 12 — Souhaits d'évolution
  const [evolution, setEvolution] = useState<ModuleEvolutionData>(
    initEvolution()
  )

  // Module 13 — Mobilité géographique
  const [mobilite, setMobilite] = useState<ModuleMobiliteData>(
    initMobilite()
  )

  // Module 14 — Langues
  const [langues, setLangues] = useState<ModuleLanguesData>(
    initLangues()
  )

  // Module 15 — Plan de formation
  const [formation, setFormation] = useState<ModuleFormationData>(
    initPlanFormation()
  )

  // Module 16 — Signatures
  const [signatures, setSignatures] = useState<ModuleSignaturesData>(
    initSignatures()
  )

  // ─────────────────────────────────────────────────────────────
  // Chargement initial
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!entretienId) {
      setLoading(false)
      setInitialLoadDone(true)
      return
    }

    getEntretienById(entretienId).then((res) => {
      if (res.error) {
        toast.error(res.error)
        setLoading(false)
        return
      }
      
      const e = res.entretien
      const p = res.profile
      if (e) {
        let identiteDb = initIdentiteSaisie()
        if (Object.keys(e.identite || {}).length > 0) {
          identiteDb = e.identite
        } else if (p) {
          // Préremplissage lors du premier chargement si l'EAD est vide
          identiteDb.prenom = p.first_name || ''
          identiteDb.nom = p.last_name || ''
          identiteDb.email = p.email || ''
          identiteDb.fonction = p.job_title || ''
          identiteDb.date_entree = p.entry_date || ''
        }
        setIdentite(identiteDb)
        if (Object.keys(e.evaluation || {}).length > 0) setEvaluation(e.evaluation)
        if (Object.keys(e.referentiel_technique || {}).length > 0) setReferentiel(e.referentiel_technique)
        if (e.bilan_annee && e.bilan_annee.length > 0) setBilan(e.bilan_annee)
        if (e.objectifs_annee_suivante && e.objectifs_annee_suivante.length > 0) setObjectifs(e.objectifs_annee_suivante)
        if (Object.keys(e.souhaits_evolution || {}).length > 0) setEvolution(e.souhaits_evolution)
        if (Object.keys(e.mobilite || {}).length > 0) setMobilite(e.mobilite)
        if (e.langues && e.langues.length > 0) setLangues(e.langues)
        if (e.plan_formation && e.plan_formation.length > 0) setFormation(e.plan_formation)
      }

      if (res.signatures) {
        const sigData = initSignatures()
        res.signatures.forEach((sig: any) => {
          if (sig.role_signataire === 'collaborateur') {
            sigData.signature_collaborateur = sig.signature_data
            sigData.date_collaborateur = sig.signe_le
          } else if (sig.role_signataire === 'manager') {
            sigData.signature_manager = sig.signature_data
            sigData.date_manager = sig.signe_le
          }
        })
        setSignatures(sigData)
      }

      setInitialLoadDone(true)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [entretienId])

  // ─────────────────────────────────────────────────────────────
  // Sauvegarde automatique
  // ─────────────────────────────────────────────────────────────
  const triggerAutoSave = useCallback(() => {
    if (!entretienId || !initialLoadDone) return

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    
    saveTimeoutRef.current = setTimeout(() => {
      const dataToSave = {
        identite,
        evaluation,
        referentiel_technique: referentiel,
        bilan_annee: bilan,
        objectifs_annee_suivante: objectifs,
        souhaits_evolution: evolution,
        mobilite,
        langues,
        plan_formation: formation,
      }
      
      upsertEntretien(entretienId, dataToSave).catch(err => {
        console.error("Erreur auto-save", err)
      })
    }, 1500)
  }, [
    entretienId, initialLoadDone, identite, evaluation, referentiel, 
    bilan, objectifs, evolution, mobilite, langues, formation
  ])

  useEffect(() => {
    triggerAutoSave()
  }, [triggerAutoSave])


  // ─────────────────────────────────────────────────────────────
  // Signatures
  // ─────────────────────────────────────────────────────────────
  const isReadOnly = Boolean(signatures.signature_collaborateur && signatures.signature_manager)

  const handleSign = async () => {
    if (!entretienId) return
    const res = await signEntretien(entretienId)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Signature enregistrée avec succès !")
      // On recharge les signatures (ou on peut juste simuler en attendant le rechargement)
      // Pour faire propre, on relance juste l'effet de chargement ou on recharge la page
      window.location.reload()
    }
  }

  const handleReopen = () => {
    // Demo only: en base, ce serait une action serveur qui efface les ead_signatures
    setSignatures(initSignatures())
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 print:gap-6 print:max-w-none">

      {/* ── En-tête ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="print:hidden flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-slate-900">Entretien Annuel de Développement</h1>
            <p className="text-sm text-slate-500">
              Formulaire digitalisé interactif.
            </p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="print:hidden flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
        >
          <FileDown className="size-4" />
          Exporter en PDF
        </button>
      </div>

      {!entretienId && (
        <div className="print:hidden flex items-start gap-4 rounded-xl border border-dashed border-[#00b2de]/40 bg-[#00b2de]/5 p-5">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#00b2de]/10">
            <ClipboardList className="size-5 text-[#00b2de]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Mode Démonstration</p>
            <p className="mt-0.5 text-sm text-slate-500">
              Vous visualisez le formulaire en mode démo. Sélectionnez un entretien depuis le tableau pour l'éditer en conditions réelles.
            </p>
          </div>
        </div>
      )}

      {/* ── Navigation par onglets ── */}
      <div className="print:hidden flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2 scrollbar-hide">
        {[
          { id: 'identite', label: '1. Identité' },
          { id: 'comportement', label: '2. Évaluation' },
          { id: 'technique', label: '3. Technique' },
          { id: 'bilan', label: '4. Bilan & Objectifs' },
          { id: 'avenir', label: '5. Évolution & Formation' },
          { id: 'signatures', label: '6. Signatures', icon: isReadOnly ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : null },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex whitespace-nowrap items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-[#00b2de] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            )}
          >
            {tab.label}
            {tab.icon}
          </button>
        ))}
      </div>

      {/* ── Onglet Identité ── */}
      <section className={cn("flex flex-col gap-3", activeTab !== 'identite' && "hidden print:flex")}>
        <Separateur label="Module 1 · Identité" />
        <ModuleIdentite
          value={{ saisie: identite }}
          onChange={setIdentite}
          readOnly={isReadOnly}
        />
      </section>

      {/* ── Onglet Évaluation ── */}
      <section className={cn("flex flex-col gap-8 print:gap-6", activeTab !== 'comportement' && "hidden print:flex")}>
        <div className="flex flex-col gap-3">
          <Separateur label="Modules 3, 4, 5 · Évaluation comportementale" />
          <SectionEvaluationComportementale
          value={evaluation}
          onChange={setEvaluation}
          readOnly={isReadOnly}
        />
        </div>
      </section>

      {/* ── Onglet Technique ── */}
      <section className={cn("flex flex-col gap-8 print:gap-6", activeTab !== 'technique' && "hidden print:flex")}>
        <div className="flex flex-col gap-3">
          <Separateur label="Modules 6, 7, 8, 9 · Référentiel technique BSN Engineering" />
          <SectionReferentielTechnique
          value={referentiel}
          onChange={setReferentiel}
          readOnly={isReadOnly}
        />
        </div>
      </section>

      {/* ── Onglet Bilan & Objectifs ── */}
      <section className={cn("flex flex-col gap-8 print:gap-6", activeTab !== 'bilan' && "hidden print:flex")}>
        <div className="flex flex-col gap-3">
          <Separateur label="Module 10 · Bilan de l'année" />
          <ModuleBilanAnnee
          value={bilan}
          onChange={setBilan}
          readOnly={isReadOnly}
        />
        </div>

        <div className="flex flex-col gap-3">
          <Separateur label="Module 11 · Fixation des objectifs de l'année suivante" />
          <ModuleObjectifsSuivants
          value={objectifs}
          onChange={setObjectifs}
          readOnly={isReadOnly}
        />
        </div>
      </section>

      {/* ── Onglet Évolution & Formation ── */}
      <section className={cn("flex flex-col gap-8 print:gap-6", activeTab !== 'avenir' && "hidden print:flex")}>
        <div className="flex flex-col gap-3">
          <Separateur label="Module 12 · Souhaits d'évolution" />
          <ModuleEvolution
          value={evolution}
          onChange={setEvolution}
          readOnly={isReadOnly}
        />
        </div>

        <div className="flex flex-col gap-3">
          <Separateur label="Module 13 · Mobilité géographique (Filières)" />
          <ModuleMobilite
          value={mobilite}
          onChange={setMobilite}
          readOnly={isReadOnly}
        />
        </div>

        <div className="flex flex-col gap-3">
          <Separateur label="Module 14 · Langues" />
          <ModuleLangues
          value={langues}
          onChange={setLangues}
          readOnly={isReadOnly}
        />
        </div>

        <div className="flex flex-col gap-3">
          <Separateur label="Module 15 · Plan de formation" />
          <ModuleFormation
          value={formation}
          onChange={setFormation}
          readOnly={isReadOnly}
        />
        </div>
      </section>

      {/* ── Onglet Signatures ── */}
      <section className={cn("flex flex-col gap-3", activeTab !== 'signatures' && "hidden print:flex")}>
        <Separateur label="Module 16 · Validation et signatures" />
        <ModuleSignatures
          value={signatures}
          onChange={setSignatures}
          onReopen={handleReopen}
          onSign={handleSign}
        />
      </section>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Séparateur de section
// ─────────────────────────────────────────────────────────────

function Separateur({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400 px-2">
        {label}
      </span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  )
}
