import type { ReactNode } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  OctagonAlert,
  Sparkles,
} from "lucide-react"
import { isDemoMode } from "@/services/apiClient"

export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "gold"

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-emerald/12 text-[#17673F] ring-emerald/25",
  warning: "bg-amber/14 text-[#835400] ring-amber/30",
  danger: "bg-[#C2412D]/10 text-[#9F3320] ring-[#C2412D]/20",
  info: "bg-forest/7 text-forest ring-forest/12",
  neutral: "bg-muted/10 text-[#56645D] ring-muted/20",
  gold: "bg-sunshine/25 text-[#6E4E00] ring-sunshine/45",
}
const DOT: Record<Tone, string> = {
  success: "bg-emerald",
  warning: "bg-amber",
  danger: "bg-[#C2412D]",
  info: "bg-botanical",
  neutral: "bg-muted",
  gold: "bg-sunshine",
}

const STATUS_TONES: Record<string, Tone> = {
  New: "gold",
  Open: "gold",
  Contacted: "info",
  Qualified: "info",
  "Survey Scheduled": "info",
  "Survey Completed": "info",
  "Quotation Sent": "info",
  Scheduled: "info",
  Sent: "info",
  "In Progress": "info",
  "In Repair": "info",
  Assigned: "info",
  Dispatched: "info",
  Ordered: "info",
  "Stock Reserved": "info",
  Diagnosed: "info",
  Confirmed: "info",
  Active: "success",
  Won: "success",
  Approved: "success",
  Accepted: "success",
  Completed: "success",
  Delivered: "success",
  Closed: "success",
  Received: "success",
  Covered: "success",
  "In Stock": "success",
  Installed: "success",
  Disbursed: "success",
  Verified: "success",
  Paid: "success",
  "Pending Approval": "warning",
  "Awaiting Response": "warning",
  "Awaiting Stock": "warning",
  "Awaiting Approval": "warning",
  "Expiring Soon": "warning",
  "Partially Received": "warning",
  Paused: "warning",
  "Awaiting Confirmation": "warning",
  "Needs Human": "warning",
  "Revisit Requested": "warning",
  Requested: "warning",
  Inspection: "warning",
  Applied: "warning",
  "Awaiting Materials": "warning",
  Chargeable: "warning",
  High: "warning",
  "Low stock": "warning",
  "Part paid": "warning",
  Rejected: "danger",
  Lost: "danger",
  Expired: "danger",
  "Faulty Returned": "danger",
  Critical: "danger",
  Cancelled: "danger",
  "Not Found": "danger",
  Delayed: "danger",
  "Out of stock": "danger",
  Unpaid: "danger",
  Draft: "neutral",
  "Not Applied": "neutral",
  Replaced: "neutral",
  Superseded: "neutral",
  "Ready to Schedule": "info",
  Low: "neutral",
  Medium: "info",
}

export function StatusBadge({
  status,
  tone,
  className = "",
  children,
}: {
  status?: string
  tone?: Tone
  className?: string
  children?: ReactNode
}) {
  const t = tone ?? STATUS_TONES[status ?? ""] ?? "neutral"
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium ring-1 ring-inset ${TONE_CLASS[t]} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${DOT[t]}`}
        aria-hidden="true"
      />
      {children ?? status}
    </span>
  )
}

export function DemoBadge({
  label = "Demo data",
  className = "",
}: {
  label?: string
  className?: string
}) {
  if (!isDemoMode) return null
  return (
    <span
      title="Mock services are active until backend endpoints are connected."
      className={`inline-flex items-center gap-1 rounded-full bg-sunshine/22 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-[#6E4E00] uppercase ring-1 ring-sunshine/45 ring-inset ${className}`}
    >
      <Sparkles className="h-3 w-3" />
      {label}
    </span>
  )
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <Loader2
      className={`h-5 w-5 animate-spin text-botanical ${className}`}
      aria-label="Loading"
    />
  )
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted"
    >
      <Spinner />
      {label}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "gap-2 py-8" : "gap-3 py-14"
      }`}
    >
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest/5 text-botanical">
          {icon}
        </div>
      )}
      <div>
        <p className="text-[15px] font-medium text-ink">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: {
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <EmptyState
      icon={<OctagonAlert className="h-5 w-5 text-[#A93A26]" />}
      title={title}
      description={description}
      action={action}
    />
  )
}

const CALLOUT: Record<"info" | "warning" | "danger" | "success", {
  cls: string
  Icon: typeof Info
}> = {
  info: { cls: "bg-forest/[0.04] border-forest/10 text-ink", Icon: Info },
  warning: {
    cls: "bg-sunshine/14 border-amber/30 text-[#5E4300]",
    Icon: AlertTriangle,
  },
  danger: {
    cls: "bg-[#C2412D]/7 border-[#C2412D]/20 text-[#7D2A1B]",
    Icon: OctagonAlert,
  },
  success: {
    cls: "bg-emerald/10 border-emerald/25 text-[#145A37]",
    Icon: CheckCircle2,
  },
}

export function Callout({
  tone = "info",
  title,
  children,
  action,
  className = "",
}: {
  tone?: keyof typeof CALLOUT
  title?: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  const { cls, Icon } = CALLOUT[tone]
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : undefined}
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${cls} ${className}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && (
          <div className={title ? "mt-0.5 opacity-90" : ""}>{children}</div>
        )}
      </div>
      {action}
    </div>
  )
}

export function Avatar({
  name,
  size = "md",
  tone = "forest",
}: {
  name: string
  size?: "sm" | "md" | "lg"
  tone?: "forest" | "gold"
}) {
  const s =
    size === "sm"
      ? "h-7 w-7 text-[11px]"
      : size === "lg"
        ? "h-12 w-12 text-base"
        : "h-9 w-9 text-xs"
  const t =
    tone === "gold"
      ? "bg-sunshine text-forest"
      : "bg-gradient-to-br from-botanical to-forest text-white"
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${s} ${t}`}
    >
      {initials}
    </span>
  )
}
