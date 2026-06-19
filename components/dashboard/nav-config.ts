import {
  ClipboardCheck,
  Receipt,
  Server,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  id: string
  label: string
  description: string
  icon: LucideIcon
}

export const STAFF_NAV: NavItem[] = [
  {
    id: "rh",
    label: "Suivi RH (Checklist)",
    description: "Contrats, documents et étapes d'intégration.",
    icon: ClipboardCheck,
  },
  {
    id: "comptable",
    label: "Suivi Comptable",
    description: "Coordonnées bancaires, notes de frais et paie.",
    icon: Receipt,
  },
  {
    id: "it",
    label: "Suivi Infrastructure / IT",
    description: "Comptes, accès et matériel.",
    icon: Server,
  },
]

export const NAV_LABELS: Record<string, string> = Object.fromEntries(
  STAFF_NAV.map((item) => [item.id, item.label]),
)
