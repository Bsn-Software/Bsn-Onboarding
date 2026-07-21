'use client'

import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ModuleMobiliteData = {
  france: string[]
  international_interesse: boolean
  international_pays: string[]
}

interface ModuleMobiliteProps {
  value: ModuleMobiliteData
  onChange: (data: ModuleMobiliteData) => void
  readOnly?: boolean
}

// ─────────────────────────────────────────────────────────────
// Données statiques (depuis CDC)
// ─────────────────────────────────────────────────────────────

const REGIONS_FRANCE = [
  'Est PACA',
  'Ouest',
  'Rhône Alpes',
  'Sud-Ouest'
]

const PAYS_INTERNATIONAL = [
  'Afrique du Sud', 'Belgique', 'Chine', 'Émirats Arabes Unis',
  'États-Unis', 'Grande-Bretagne', 'Italie', 'Maroc', 'Portugal',
  'Russie', 'Suisse', 'Allemagne', 'Brésil', 'Canada', 'Espagne',
  'Finlande', 'Inde', 'Luxembourg', 'Pologne', 'Roumanie',
  'Slovaquie', 'Turquie'
].sort() // Tri alphabétique pour plus de lisibilité

export function initMobilite(): ModuleMobiliteData {
  return {
    france: [],
    international_interesse: false,
    international_pays: [],
  }
}

// ─────────────────────────────────────────────────────────────
// Composant principal — Module 13
// ─────────────────────────────────────────────────────────────

export function ModuleMobilite({
  value,
  onChange,
  readOnly = false,
}: ModuleMobiliteProps) {
  
  const toggleFrance = (region: string) => {
    if (readOnly) return
    const newFrance = value.france.includes(region)
      ? value.france.filter((r) => r !== region)
      : [...value.france, region]
    onChange({ ...value, france: newFrance })
  }

  const togglePays = (pays: string) => {
    if (readOnly) return
    const newPays = value.international_pays.includes(pays)
      ? value.international_pays.filter((p) => p !== pays)
      : [...value.international_pays, pays]
    onChange({ ...value, international_pays: newPays })
  }

  const setInternationalInteresse = (interesse: boolean) => {
    if (readOnly) return
    onChange({
      ...value,
      international_interesse: interesse,
      // Si on décoche, on vide la liste des pays pour garder un state propre
      international_pays: interesse ? value.international_pays : []
    })
  }

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-slate-900">Mobilité géographique (Filières)</h3>
        <p className="text-xs text-slate-500">
          Indiquez vos souhaits de mobilité en France ou à l&apos;international.
        </p>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        
        {/* ── France ── */}
        <div className="flex flex-1 flex-col gap-3">
          <h4 className="text-sm font-medium text-slate-800">Secteur France</h4>
          <div className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 p-4">
            {REGIONS_FRANCE.map((region) => (
              <label
                key={region}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-slate-100/50",
                  readOnly && "pointer-events-none opacity-80"
                )}
              >
                <input
                  type="checkbox"
                  checked={value.france.includes(region)}
                  onChange={() => toggleFrance(region)}
                  disabled={readOnly}
                  className="size-4 rounded border-slate-300 text-[#00b2de] focus:ring-[#00b2de]"
                />
                <span className="text-sm text-slate-700">{region}</span>
              </label>
            ))}
          </div>
        </div>

        {/* ── International ── */}
        <div className="flex flex-1 flex-col gap-3">
          <h4 className="text-sm font-medium text-slate-800">Secteur International</h4>
          <div className="flex flex-col gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
            
            <label
              className={cn(
                "flex cursor-pointer items-center gap-3",
                readOnly && "pointer-events-none opacity-80"
              )}
            >
              <input
                type="checkbox"
                checked={value.international_interesse}
                onChange={(e) => setInternationalInteresse(e.target.checked)}
                disabled={readOnly}
                className="size-4 rounded border-slate-300 text-[#00b2de] focus:ring-[#00b2de]"
              />
              <span className="text-sm font-medium text-slate-800">
                Je suis intéressé(e) par une mobilité internationale
              </span>
            </label>

            {/* Liste des pays (visible uniquement si intéressé) */}
            {value.international_interesse && (
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-200/60 pt-4 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
                {PAYS_INTERNATIONAL.map((pays) => (
                  <label
                    key={pays}
                    className={cn(
                      "flex cursor-pointer items-center gap-2",
                      readOnly && "pointer-events-none opacity-80"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={value.international_pays.includes(pays)}
                      onChange={() => togglePays(pays)}
                      disabled={readOnly}
                      className="size-3.5 rounded border-slate-300 text-[#00b2de] focus:ring-[#00b2de]"
                    />
                    <span className="text-xs text-slate-600 truncate" title={pays}>
                      {pays}
                    </span>
                  </label>
                ))}
              </div>
            )}
            
          </div>
        </div>

      </div>
    </div>
  )
}
