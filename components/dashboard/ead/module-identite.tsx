'use client'

import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

// Les champs provenaient de la fiche, mais sont maintenant éditables.

/**
 * Données propres à l'entretien — saisies dans le formulaire EAD.
 * Stockées dans la colonne JSONB `identite` de `ead_entretiens`.
 */
export type IdentiteSaisie = {
  prenom: string
  nom: string
  email: string
  fonction: string
  date_entree: string
  date_entretien: string        // date
  secteur: string
  agence: string
  date_naissance: string        // date
  societe: string
  bu: string
  nb_personnes_encadrees: string // conservé en string pour le input
  coefficient: string
  position: string
  code_fonction: string
  statut_actuel: string
  emails_supplementaires: string // liste libre séparée par virgules
}

export type ModuleIdentiteData = {
  saisie: IdentiteSaisie
}

interface ModuleIdentiteProps {
  value: ModuleIdentiteData
  onChange: (saisie: IdentiteSaisie) => void
  readOnly?: boolean
}

// ─────────────────────────────────────────────────────────────
// Utilitaire — valeur initiale vide pour IdentiteSaisie
// ─────────────────────────────────────────────────────────────

export function initIdentiteSaisie(): IdentiteSaisie {
  return {
    prenom: '',
    nom: '',
    email: '',
    fonction: '',
    date_entree: '',
    date_entretien: '',
    secteur: '',
    agence: '',
    date_naissance: '',
    societe: '',
    bu: '',
    nb_personnes_encadrees: '',
    coefficient: '',
    position: '',
    code_fonction: '',
    statut_actuel: '',
    emails_supplementaires: '',
  }
}

// ─────────────────────────────────────────────────────────────
// Petits composants d'affichage réutilisables
// ─────────────────────────────────────────────────────────────

// Supprimé : ChampLectureSeule car tous les champs sont maintenant éditables

/** Champ de saisie propre à l'EAD */
function ChampSaisie({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'date' | 'number'
  placeholder?: string
  disabled?: boolean
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          'rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm',
          'text-sm font-medium text-slate-900 placeholder:text-slate-300 placeholder:font-normal',
          'outline-none transition-all duration-200',
          'hover:border-[#00b2de]/50',
          'focus:border-[#00b2de] focus:ring-4 focus:ring-[#00b2de]/10',
          'disabled:cursor-not-allowed disabled:bg-slate-50/50 disabled:text-slate-400 disabled:hover:border-slate-200',
        )}
      />
      {hint && (
        <p className="text-xs text-slate-400">{hint}</p>
      )}
    </div>
  )
}

/** Champ de saisie pour les dates avec un DatePicker */
function ChampDate({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
        {label}
      </label>
      <DatePicker date={value} setDate={onChange} disabled={disabled} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Composant principal — Module 1 : Identité
// ─────────────────────────────────────────────────────────────

export function ModuleIdentite({ value, onChange, readOnly = false }: ModuleIdentiteProps) {
  const { saisie } = value

  const update = (patch: Partial<IdentiteSaisie>) => {
    if (readOnly) return
    onChange({ ...saisie, ...patch })
  }



  return (
    <div className="flex flex-col gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      {/* ── Titre section ── */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Identité du collaborateur</h3>
          <p className="mt-1 text-sm text-slate-500">
            Ces champs sont pré-remplis avec les informations du profil collaborateur, mais vous pouvez les corriger si besoin.
          </p>
        </div>
      </div>

      {/* ─── Bloc 1 : Informations personnelles ─── */}
      <fieldset className="flex flex-col gap-5 rounded-2xl bg-blue-50/30 p-5 border border-blue-100/50">
        <legend className="px-3 text-sm font-bold tracking-wide text-blue-700 bg-blue-100/50 rounded-full py-1 border border-blue-200">
          Informations personnelles
        </legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Ex-champs lecture seule */}
          <ChampSaisie label="Prénom" value={saisie.prenom} onChange={(v) => update({ prenom: v })} disabled={readOnly} />
          <ChampSaisie label="Nom" value={saisie.nom} onChange={(v) => update({ nom: v })} disabled={readOnly} />
          <ChampSaisie label="Email" value={saisie.email} onChange={(v) => update({ email: v })} disabled={readOnly} />
          <ChampSaisie label="Fonction occupée" value={saisie.fonction} onChange={(v) => update({ fonction: v })} disabled={readOnly} />

          {/* Propre à l'EAD */}
          <ChampDate
            label="Date de naissance"
            value={saisie.date_naissance}
            onChange={(v) => update({ date_naissance: v })}
            disabled={readOnly}
          />
          <ChampSaisie
            label="Société"
            value={saisie.societe}
            onChange={(v) => update({ societe: v })}
            placeholder="ex: BSN Engineering"
            disabled={readOnly}
          />
          <ChampSaisie
            label="Actuellement, vous êtes"
            value={saisie.statut_actuel}
            onChange={(v) => update({ statut_actuel: v })}
            placeholder="ex: Cadre, ETAM…"
            disabled={readOnly}
            hint="Statut contractuel au moment de l'entretien"
          />
        </div>
      </fieldset>

      {/* ─── Bloc 2 : Rattachement & poste ─── */}
      <fieldset className="flex flex-col gap-5 rounded-2xl bg-emerald-50/30 p-5 border border-emerald-100/50">
        <legend className="px-3 text-sm font-bold tracking-wide text-emerald-700 bg-emerald-100/50 rounded-full py-1 border border-emerald-200">
          Rattachement & poste
        </legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Ex-champ lecture seule */}
          <ChampDate label="Date d'entrée" value={saisie.date_entree} onChange={(v) => update({ date_entree: v })} disabled={readOnly} />

          {/* Propres à l'EAD */}
          <ChampSaisie
            label="Secteur"
            value={saisie.secteur}
            onChange={(v) => update({ secteur: v })}
            placeholder="ex: Nucléaire, Oil & Gaz…"
            disabled={readOnly}
          />
          <ChampSaisie
            label="Agence de rattachement"
            value={saisie.agence}
            onChange={(v) => update({ agence: v })}
            placeholder="ex: Paris, Lyon…"
            disabled={readOnly}
          />
          <ChampSaisie
            label="BU"
            value={saisie.bu}
            onChange={(v) => update({ bu: v })}
            placeholder="ex: Ingénierie, Nucléaire…"
            disabled={readOnly}
          />
          <ChampSaisie
            label="Position"
            value={saisie.position}
            onChange={(v) => update({ position: v })}
            placeholder="ex: P1, P2…"
            disabled={readOnly}
          />
          <ChampSaisie
            label="Coefficient"
            value={saisie.coefficient}
            onChange={(v) => update({ coefficient: v })}
            placeholder="ex: 130, 150…"
            disabled={readOnly}
          />
          <ChampSaisie
            label="Code Fonction"
            value={saisie.code_fonction}
            onChange={(v) => update({ code_fonction: v })}
            placeholder="ex: ING-01…"
            disabled={readOnly}
          />
          <ChampSaisie
            label="Nbre de personnes encadrées"
            type="number"
            value={saisie.nb_personnes_encadrees}
            onChange={(v) => update({ nb_personnes_encadrees: v })}
            placeholder="0"
            disabled={readOnly}
          />
        </div>
      </fieldset>

      {/* ─── Bloc 3 : Entretien ─── */}
      <fieldset className="flex flex-col gap-5 rounded-2xl bg-violet-50/30 p-5 border border-violet-100/50">
        <legend className="px-3 text-sm font-bold tracking-wide text-violet-700 bg-violet-100/50 rounded-full py-1 border border-violet-200">
          Informations de l&apos;entretien
        </legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ChampDate
            label="Date de l'entretien"
            value={saisie.date_entretien}
            onChange={(v) => update({ date_entretien: v })}
            disabled={readOnly}
          />
          <ChampSaisie
            label="Email(s) supplémentaire(s)"
            value={saisie.emails_supplementaires}
            onChange={(v) => update({ emails_supplementaires: v })}
            placeholder="autre@email.com, …"
            disabled={readOnly}
            hint="Plusieurs emails séparés par des virgules"
          />
        </div>
      </fieldset>

    </div>
  )
}
