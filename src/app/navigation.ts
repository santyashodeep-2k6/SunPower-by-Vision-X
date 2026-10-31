import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  FileText,
  HardHat,
  LayoutDashboard,
  MessagesSquare,
  PackageCheck,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UserRoundSearch,
  Users,
  Wrench,
  Receipt,
  Sun,
} from "lucide-react"
import type { Role } from "@/lib/types"

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  sales: "Sales",
  surveyor: "Surveyor",
  inventory: "Inventory Manager",
  installer: "Installation Technician",
  service: "Service Technician",
  customer: "Customer",
}

export const ROLE_DESCRIPTION: Record<Role, string> = {
  admin: "Inspect every module, approvals and reports",
  sales: "Leads, conversations, surveys and quotations",
  surveyor: "Assigned surveys and technical assessments",
  inventory: "Products, purchases, stock and dispatch",
  installer: "Assigned installations and worksheets",
  service: "Assigned service tickets and repairs",
  customer: "Own installation, documents and service only",
}

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  roles: Role[]
  group: "Sales & CRM" | "Operations" | "After-sales" | "Management"
}

const ALL_STAFF: Role[] = [
  "admin",
  "sales",
  "surveyor",
  "inventory",
  "installer",
  "service",
]

export const NAV_ITEMS: NavItem[] = [
  {
    to: "/app/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "sales"],
    group: "Sales & CRM",
  },
  {
    to: "/app/leads",
    label: "Leads",
    icon: UserRoundSearch,
    roles: ["admin", "sales"],
    group: "Sales & CRM",
  },
  {
    to: "/app/conversations",
    label: "Conversations",
    icon: MessagesSquare,
    roles: ["admin", "sales"],
    group: "Sales & CRM",
  },
  {
    to: "/app/surveys",
    label: "Surveys",
    icon: ClipboardCheck,
    roles: ["admin", "sales", "surveyor"],
    group: "Sales & CRM",
  },
  {
    to: "/app/quotations",
    label: "Quotations",
    icon: FileText,
    roles: ["admin", "sales"],
    group: "Sales & CRM",
  },
  {
    to: "/app/orders",
    label: "Orders",
    icon: Receipt,
    roles: ["admin", "sales", "inventory"],
    group: "Operations",
  },
  {
    to: "/app/purchases",
    label: "Purchase",
    icon: ShoppingCart,
    roles: ["admin", "inventory"],
    group: "Operations",
  },
  {
    to: "/app/inventory",
    label: "Inventory",
    icon: Boxes,
    roles: ["admin", "inventory"],
    group: "Operations",
  },
  {
    to: "/app/dispatches",
    label: "Dispatch",
    icon: Truck,
    roles: ["admin", "inventory"],
    group: "Operations",
  },
  {
    to: "/app/installations",
    label: "Installations",
    icon: PackageCheck,
    roles: ["admin", "sales", "installer"],
    group: "Operations",
  },
  {
    to: "/app/technician",
    label: "Technician Workspace",
    icon: HardHat,
    roles: ["admin", "installer"],
    group: "Operations",
  },
  {
    to: "/app/warranties",
    label: "Warranties",
    icon: ShieldCheck,
    roles: ["admin", "sales", "service"],
    group: "After-sales",
  },
  {
    to: "/app/service-tickets",
    label: "Service Tickets",
    icon: Wrench,
    roles: ["admin", "service"],
    group: "After-sales",
  },
  {
    to: "/app/reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["admin"],
    group: "Management",
  },
  {
    to: "/app/users",
    label: "Users",
    icon: Users,
    roles: ["admin"],
    group: "Management",
  },
  {
    to: "/app/settings",
    label: "Settings",
    icon: Settings,
    roles: ALL_STAFF,
    group: "Management",
  },
]

export const PASSPORT_NAV = { label: "Asset Passport", icon: Sun }

export function canAccess(role: Role, pathname: string) {
  if (pathname.startsWith("/app/passport")) return role !== "customer"
  const item = NAV_ITEMS.filter(
    (n) => pathname === n.to || pathname.startsWith(`${n.to}/`),
  ).sort((a, b) => b.to.length - a.to.length)[0]
  return item ? item.roles.includes(role) : role === "admin"
}

export function homeFor(role: Role) {
  switch (role) {
    case "customer":
      return "/portal"
    case "surveyor":
      return "/app/surveys"
    case "inventory":
      return "/app/inventory"
    case "installer":
      return "/app/technician"
    case "service":
      return "/app/service-tickets"
    default:
      return "/app/dashboard"
  }
}

export const SEGMENT_LABEL: Record<string, string> = {
  app: "Workspace",
  dashboard: "Dashboard",
  leads: "Leads",
  conversations: "Conversations",
  surveys: "Surveys",
  quotations: "Quotations",
  orders: "Orders",
  purchases: "Purchase",
  inventory: "Inventory",
  dispatches: "Dispatch",
  installations: "Installations",
  technician: "Technician Workspace",
  warranties: "Warranties",
  "service-tickets": "Service Tickets",
  reports: "Reports",
  users: "Users",
  settings: "Settings",
  passport: "Asset Passport",
}
