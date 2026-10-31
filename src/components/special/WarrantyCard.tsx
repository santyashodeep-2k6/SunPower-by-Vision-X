import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react"
import { fmtDate } from "@/lib/format"
import { StatusBadge } from "@/components/ui/feedback"
import type { WarrantyVerification } from "@/services/aftersales"

export function WarrantyCard({
  v,
  compact,
}: {
  v: WarrantyVerification
  compact?: boolean
}) {
  const total =
    v.start && v.end
      ? new Date(v.end).getTime() - new Date(v.start).getTime()
      : 0
  const used = v.start
    ? Math.min(
        1,
        Math.max(0, (Date.now() - new Date(v.start).getTime()) / (total || 1)),
      )
    : 0
  const Icon =
    v.state === "Not Found"
      ? ShieldQuestion
      : v.covered
        ? ShieldCheck
        : ShieldAlert
  return (
    <div
      className={`rounded-2xl border ${
        v.covered
          ? "border-emerald/30 bg-emerald/[0.06]"
          : v.state === "Not Found"
            ? "border-forest/12 bg-white"
            : "border-[#C2412D]/20 bg-[#C2412D]/[0.04]"
      } ${compact ? "p-3.5" : "p-4"}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            v.covered
              ? "bg-emerald/15 text-botanical"
              : "bg-[#C2412D]/10 text-[#A93A26]"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">{v.productName}</p>
            <StatusBadge status={v.state} />
          </div>
          <p className="mt-0.5 font-mono text-[12px] text-muted">{v.serial}</p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
        <div>
          <dt className="text-muted">Customer</dt>
          <dd className="font-medium text-ink">{v.customerName}</dd>
        </div>
        <div>
          <dt className="text-muted">Installation</dt>
          <dd className="font-mono font-medium text-ink">
            {v.installationRef}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Warranty start</dt>
          <dd className="font-medium text-ink">{fmtDate(v.start)}</dd>
        </div>
        <div>
          <dt className="text-muted">Warranty expiry</dt>
          <dd className="font-medium text-ink">{fmtDate(v.end)}</dd>
        </div>
      </dl>
      {total > 0 && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-forest/8">
            <span
              className={`block h-full rounded-full ${
                v.covered ? "bg-emerald" : "bg-[#C2412D]/60"
              }`}
              style={{ width: `${used * 100}%` }}
            />
          </div>
          {!compact && v.terms && (
            <p className="mt-2 text-[12px] text-muted">{v.terms}</p>
          )}
        </div>
      )}
      <p className="mt-3 text-[11px] text-muted">
        Coverage status:{" "}
        <span className="font-semibold text-ink">
          {v.covered
            ? "Covered"
            : v.state === "Not Found"
              ? "No warranty record"
              : "Not covered"}
        </span>{" "}
        · Verified by{" "}
        {v.verifiedBy === "backend"
          ? "SunFlow 360 backend"
          : "demo verification service (official validity is confirmed by the backend)"}
      </p>
    </div>
  )
}
