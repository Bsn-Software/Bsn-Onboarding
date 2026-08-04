'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Pencil, RotateCcw, Check, X, Loader2, ChevronDown, ChevronRight,
  Eye, EyeOff, Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getEadItemsConfig,
  upsertEadItemConfig,
  resetEadItemConfig,
  type EadItemConfig,
} from '@/app/actions/ead-config'
import {
  buildConfigMap,
  getEffectiveLibelle,
  getEffectiveSousLibelle,
  isItemActif,
  isItemCustomized,
  type ConfigMap,
} from '@/lib/ead-items-resolver'
import {
  ITEMS_MODULE_3,
  ITEMS_MODULE_4,
  ITEMS_MODULE_5,
} from '@/components/dashboard/ead/items-evaluation'
import type { EadItemComportemental } from '@/components/dashboard/ead/bloc-evaluation-comportementale'
import {
  MODULE_6_CONNAISSANCES_TECHNIQUES,
  MODULE_7_COMPETENCES_PROJET,
  MODULE_8_PERIMETRES,
  MODULE_9_SECTEURS,
  type RefItem,
} from '@/components/dashboard/ead/referentiels'
import { toast } from 'sonner'

// ─────────────────────────────────────────────────────────────
// Types locaux
// ─────────────────────────────────────────────────────────────

type ComportementalSection = {
  key: 'competences_generales' | 'sens_du_service' | 'expertise_metier'
  label: string
  items: EadItemComportemental[]
}

type ReferentielSection = {
  key: string
  label: string
  items: RefItem[]
  codeKey: 'id'
}

// ─────────────────────────────────────────────────────────────
// Données statiques des sections
// ─────────────────────────────────────────────────────────────

const COMPORTEMENTAL_SECTIONS: ComportementalSection[] = [
  { key: 'competences_generales', label: 'Module 3 — Compétences générales',         items: ITEMS_MODULE_3 },
  { key: 'sens_du_service',       label: 'Module 4 — Sens du service / Relation client', items: ITEMS_MODULE_4 },
  { key: 'expertise_metier',      label: 'Module 5 — Expertise métier',               items: ITEMS_MODULE_5 },
]

const REFERENTIEL_SECTIONS: ReferentielSection[] = [
  { key: 'connaissances_techniques', label: 'Module 6 — Connaissances techniques', items: MODULE_6_CONNAISSANCES_TECHNIQUES, codeKey: 'id' },
  { key: 'competences_projet',       label: 'Module 7 — Compétences projet',       items: MODULE_7_COMPETENCES_PROJET,          codeKey: 'id' },
  { key: 'perimetres_intervention',  label: 'Module 8 — Périmètres d\'intervention', items: MODULE_8_PERIMETRES,                codeKey: 'id' },
  { key: 'secteurs_intervention',    label: 'Module 9 — Secteurs d\'intervention',  items: MODULE_9_SECTEURS,                   codeKey: 'id' },
]

// ─────────────────────────────────────────────────────────────
// ItemRow — ligne d'un item dans le tableau
// ─────────────────────────────────────────────────────────────

function ItemRow({
  code,
  defaultLibelle,
  sousLibelle,
  hasSousLibelle = false,
  configMap,
  onToggle,
  onSaveLibelle,
  onReset,
}: {
  code: string
  defaultLibelle: string
  sousLibelle?: string
  hasSousLibelle?: boolean  // true pour les items Module 7 qui ont un sous_libelle
  configMap: ConfigMap
  onToggle: (code: string, actif: boolean) => Promise<void>
  onSaveLibelle: (code: string, libelle: string, sousLibelle: string | null) => Promise<void>
  onReset: (code: string) => Promise<void>
}) {
  const actif = isItemActif(code, configMap)
  const customized = isItemCustomized(code, configMap)
  const effectiveLibelle = getEffectiveLibelle(defaultLibelle, code, configMap)
  const effectiveSousLibelle = getEffectiveSousLibelle(sousLibelle, code, configMap)

  const [editing, setEditing] = useState(false)
  const [draftLibelle, setDraftLibelle] = useState(effectiveLibelle)
  const [draftSousLibelle, setDraftSousLibelle] = useState(effectiveSousLibelle ?? '')
  const [saving, setSaving] = useState(false)

  // Sync drafts si la configMap change
  useEffect(() => {
    setDraftLibelle(getEffectiveLibelle(defaultLibelle, code, configMap))
    setDraftSousLibelle(getEffectiveSousLibelle(sousLibelle, code, configMap) ?? '')
  }, [configMap, code, defaultLibelle, sousLibelle])

  const handleToggle = async () => {
    setSaving(true)
    await onToggle(code, !actif)
    setSaving(false)
  }

  const handleSave = async () => {
    const libelleToSave = draftLibelle.trim() || defaultLibelle
    const sousLibelleToSave = hasSousLibelle ? (draftSousLibelle.trim() || null) : null
    setSaving(true)
    await onSaveLibelle(code, libelleToSave, sousLibelleToSave)
    setSaving(false)
    setEditing(false)
  }

  const handleCancel = () => {
    setDraftLibelle(effectiveLibelle)
    setDraftSousLibelle(effectiveSousLibelle ?? '')
    setEditing(false)
  }

  const handleReset = async () => {
    setSaving(true)
    await onReset(code)
    setSaving(false)
  }

  return (
    <div className={cn(
      'flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-all',
      !actif ? 'border-slate-100 bg-slate-50 opacity-60' : 'border-slate-200 bg-white hover:border-slate-300'
    )}>
      {/* Code */}
      <span className="mt-0.5 shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-500 leading-none">
        {code}
      </span>

      {/* Libellé */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={draftLibelle}
                onChange={e => setDraftLibelle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') handleCancel() }}
                placeholder="Libellé principal"
                className="flex-1 rounded-lg border border-[#00b2de] bg-white px-2.5 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00b2de]/20"
              />
            </div>
            {hasSousLibelle && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 shrink-0 w-16">Sous-lib.</span>
                <input
                  value={draftSousLibelle}
                  onChange={e => setDraftSousLibelle(e.target.value)}
                  placeholder={sousLibelle ?? 'Sous-libellé (optionnel)'}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-[#00b2de] focus:outline-none focus:ring-2 focus:ring-[#00b2de]/20"
                />
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-0.5">
              <button
                onClick={handleSave}
                disabled={saving || !draftLibelle.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-[#00b2de] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#0096c7] disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                Enregistrer
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <X className="size-3" /> Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="min-w-0">
              <span className={cn('text-sm font-medium leading-snug', !actif ? 'line-through text-slate-400' : 'text-slate-800')}>
                {effectiveLibelle}
              </span>
              {effectiveSousLibelle && (
                <span className="block text-xs text-slate-400">{effectiveSousLibelle}</span>
              )}
            </div>
            {customized && (
              <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                modifié
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {!editing && (
        <div className="flex items-center gap-1 shrink-0">
          {/* Modifier libellé */}
          <button
            onClick={() => { setDraftLibelle(effectiveLibelle); setDraftSousLibelle(effectiveSousLibelle ?? ''); setEditing(true) }}
            disabled={saving}
            title="Modifier le libellé"
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50"
          >
            <Pencil className="size-3.5" />
          </button>

          {/* Reset */}
          {customized && (
            <button
              onClick={handleReset}
              disabled={saving}
              title="Remettre par défaut"
              className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-orange-50 hover:text-orange-600 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
            </button>
          )}

          {/* Toggle actif/inactif */}
          <button
            onClick={handleToggle}
            disabled={saving}
            title={actif ? 'Masquer cet item' : 'Afficher cet item'}
            className={cn(
              'flex size-7 items-center justify-center rounded-lg transition-colors disabled:opacity-50',
              actif
                ? 'text-slate-400 hover:bg-amber-50 hover:text-amber-600'
                : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
            )}
          >
            {saving
              ? <Loader2 className="size-3.5 animate-spin" />
              : actif ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />
            }
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SectionBlock — accordéon pour une section
// ─────────────────────────────────────────────────────────────

function SectionBlock({
  label,
  count,
  hiddenCount,
  open,
  onToggle,
  children,
}: {
  label: string
  count: number
  hiddenCount: number
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="size-4 text-slate-500" /> : <ChevronRight className="size-4 text-slate-500" />}
          <span className="text-sm font-semibold text-slate-800">{label}</span>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
            {count} items
          </span>
          {hiddenCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {hiddenCount} masqué{hiddenCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="flex flex-col gap-1.5 p-3">
          {children}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Composant principal — SettingsEadItems
// ─────────────────────────────────────────────────────────────

export function SettingsEadItems() {
  const [configs, setConfigs] = useState<EadItemConfig[]>([])
  const [configMap, setConfigMap] = useState<ConfigMap>(new Map())
  const [loading, setLoading] = useState(true)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['competences_generales', 'connaissances_techniques']))

  const loadConfig = useCallback(async () => {
    setLoading(true)
    const data = await getEadItemsConfig()
    setConfigs(data)
    setConfigMap(buildConfigMap(data))
    setLoading(false)
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  const toggleSection = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // ── Actions ────────────────────────────────────────────────

  const handleToggle = async (code: string, actif: boolean) => {
    // Optimistic update
    const prev = new Map(configMap)
    const existing = prev.get(code)
    prev.set(code, { id: existing?.id ?? '', item_code: code, libelle: existing?.libelle ?? null, sous_libelle: existing?.sous_libelle ?? null, actif, updated_at: '' })
    setConfigMap(prev)

    const res = await upsertEadItemConfig(code, { libelle: existing?.libelle ?? null, sous_libelle: existing?.sous_libelle ?? null, actif })
    if (res.error) {
      toast.error(res.error)
      // Rollback
      setConfigMap(configMap)
    } else {
      toast.success(actif ? 'Item activé.' : 'Item masqué.')
      await loadConfig()
    }
  }

  const handleSaveLibelle = async (code: string, libelle: string, sousLibelle: string | null) => {
    const existing = configMap.get(code)
    const actif = existing ? existing.actif : true

    const res = await upsertEadItemConfig(code, { libelle, sous_libelle: sousLibelle, actif })
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Libellé mis à jour.')
      await loadConfig()
    }
  }

  const handleReset = async (code: string) => {
    const res = await resetEadItemConfig(code)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Item remis par défaut.')
      await loadConfig()
    }
  }

  // ── Résumé global ──────────────────────────────────────────

  const totalCustomized = configs.length
  const totalHidden = configs.filter(c => !c.actif).length

  // ── Rendu ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-7 animate-spin text-[#00b2de]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Items d'évaluation EAD</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Personnalisez les libellés et masquez les items qui ne s'appliquent pas à votre organisation.
            <br />
            <span className="text-amber-600 font-medium">Les entretiens déjà créés ne sont pas affectés.</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {totalCustomized > 0 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {totalCustomized} personnalisé{totalCustomized > 1 ? 's' : ''}
            </span>
          )}
          {totalHidden > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
              {totalHidden} masqué{totalHidden > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* ── Évaluation comportementale ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex size-7 items-center justify-center rounded-lg bg-blue-100">
            <Settings2 className="size-4 text-blue-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Évaluation comportementale</h3>
          <span className="text-xs text-slate-400">Modules 3, 4, 5</span>
        </div>

        <div className="flex flex-col gap-2">
          {COMPORTEMENTAL_SECTIONS.map(section => {
            const hidden = section.items.filter(i => !isItemActif(i.code, configMap)).length
            return (
              <SectionBlock
                key={section.key}
                label={section.label}
                count={section.items.length}
                hiddenCount={hidden}
                open={openSections.has(section.key)}
                onToggle={() => toggleSection(section.key)}
              >
                {section.items.map(item => (
                  <ItemRow
                    key={item.code}
                    code={item.code}
                    defaultLibelle={item.libelle}
                    configMap={configMap}
                    onToggle={handleToggle}
                    onSaveLibelle={handleSaveLibelle}
                    onReset={handleReset}
                  />
                ))}
              </SectionBlock>
            )
          })}
        </div>
      </div>

      {/* ── Référentiel technique ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-100">
            <Settings2 className="size-4 text-indigo-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Référentiel technique BSN</h3>
          <span className="text-xs text-slate-400">Modules 6, 7, 8, 9</span>
        </div>

        <div className="flex flex-col gap-2">
          {REFERENTIEL_SECTIONS.map(section => {
            const hidden = section.items.filter(i => !isItemActif(i.id, configMap)).length
            return (
              <SectionBlock
                key={section.key}
                label={section.label}
                count={section.items.length}
                hiddenCount={hidden}
                open={openSections.has(section.key)}
                onToggle={() => toggleSection(section.key)}
              >
                {section.items.map(item => (
                  <ItemRow
                    key={item.id}
                    code={item.id}
                    defaultLibelle={item.libelle}
                    sousLibelle={item.sous_libelle}
                    hasSousLibelle={!!item.sous_libelle}
                    configMap={configMap}
                    onToggle={handleToggle}
                    onSaveLibelle={handleSaveLibelle}
                    onReset={handleReset}
                  />
                ))}
              </SectionBlock>
            )
          })}
        </div>
      </div>
    </div>
  )
}
