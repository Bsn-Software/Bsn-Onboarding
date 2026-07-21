import {
  ClipboardCheck,
  ClipboardList,
  Receipt,
  Server,
  UserPlus,
  UserMinus,
  CalendarOff,
  TrendingUp,
  Settings,
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
    id: "entrees",
    label: "Suivi des entrées",
    description: "Contrats, documents et étapes d'intégration.",
    icon: UserPlus,
  },
  {
    id: "sorties",
    label: "Suivi des sorties", // Correction orthographe
    description: "Restitution de matériel, entretiens de départ et fin de contrat.",
    icon: UserMinus,
  },
  {
    id: "absences",
    label: "Suivi des longues absences",
    description: "Congés sabbatiques, arrêts maladie et gestion des compteurs.",
    icon: CalendarOff,
  },
  {
    id: "turnover",
    label: "Suivi du turnover",
    description: "Analyses, taux de rotation et statistiques RH.",
    icon: TrendingUp,
  },
  {
    id: "ead",
    label: "Suivi des EAD",
    description: "Entretiens annuels de développement digitalisés.",
    icon: ClipboardList,
  },
];

export const NAV_LABELS: Record<string, string> = Object.fromEntries(
  STAFF_NAV.map((item) => [item.id, item.label]),
)
