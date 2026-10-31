import { useMemo, useState } from "react"
import { Link } from "react-router"
import { QRCodeSVG } from "qrcode.react"
import {
  BadgeCheck,
  FileText,
  Image as ImageIcon,
  Lock,
  RefreshCcw,
  Wrench,
} from "lucide-react"
import type { DemoDB, Installation } from "@/lib/types"
import { fmtDate, inr } from "@/lib/format"
import {
  byId,
  productName,
  projectFinancials,
  warrantyState,
} from "@/lib/rules"
import { handoverHtml, invoiceHtml, quotationHtml } from "@/lib/documents"
import { StatusBadge } from "@/components/ui/feedback"
import { Panel } from "@/components/ui/data"
import { DocumentPreview } from "./DocumentPreview"

export const passportUrl = (ref: string) =>
  `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/passport/${ref}`

export function PassportQR({
  reference,
  size = 128,
}: {
  reference: string
  size?: number
}) {
  return (
    <div className="inline-flex flex-col items-center gap-2 rounded-2xl bg-white p-3 shadow-[0_8px_24px_-14px_rgb(16_61_45/0.4)]">
      <QRCodeSVG
        value={passportUrl(reference)}
        size={size}
        fgColor="#103D2D"
        level="M"
        marginSize={0}
      />
      <span className="font-mono text-[11px] font-semibold tracking-wide text-ink">
        {reference}
      </span>
    </div>
  )
}

/** Full passport for authenticated employees ('internal') or the owning customer ('customer'). */
export function SolarAssetPassport({
  db,
  inst,
  view,
}: {
  db: DemoDB
  inst: Installation
  view: "internal" | "customer"
}) {
  const [doc, setDoc] = useState<null | "quote" | "invoice" | "handover">(null)
  const customer = byId(db.customers, inst.customerId)
  const site = byId(db.sites, inst.siteId)
  const so = byId(db.salesOrders, inst.salesOrderId)
  const quote = so && byId(db.quotations, so.quotationId)
  const units = db.units.filter((u) => u.installationId === inst.id)
  const warranties = db.warranties.filter((w) => w.installationId === inst.id)
  const tickets = db.serviceTickets.filter((t) => t.installationId === inst.id)
  const replacements = db.replacements.filter(
    (r) => r.installationId === inst.id,
  )
  const fin = useMemo(
    () => (view === "internal" ? projectFinancials(db, inst.id) : null),
    [db, inst.id, view],
  )
  const docHtml =
    doc === "quote" && quote
      ? quotationHtml(db, quote)
      : doc === "invoice" && so
        ? invoiceHtml(db, so)
        : doc === "handover"
          ? handoverHtml(db, inst)
          : ""

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-forest p-6 text-white sm:p-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(60%_80%_at_100%_0%,rgb(244_197_66/0.28),transparent_60%),radial-gradient(50%_60%_at_0%_100%,rgb(56_184_120/0.25),transparent_60%)]"
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[12px] font-medium tracking-[0.16em] text-sunshine uppercase">
              Solar Asset Passport ·{" "}
              {view === "internal" ? "Employee view" : "Customer view"}
            </p>
            <h2 className="mt-2 font-mono text-3xl font-semibold tracking-tight">
              {inst.reference}
            </h2>
            <p className="mt-2 text-white/75">
              {inst.capacity} kW {inst.systemType} · {site?.city} ·{" "}
              {inst.status === "Completed"
                ? `Commissioned ${fmtDate(inst.completedAt)}`
                : inst.status}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
              <span className="rounded-full bg-white/12 px-3 py-1">
                {units.filter((u) => u.status === "Installed").length}{" "}
                serialized components
              </span>
              <span className="rounded-full bg-white/12 px-3 py-1">
                {
                  warranties.filter((w) =>
                    ["Active", "Expiring Soon"].includes(warrantyState(w)),
                  ).length
                }{" "}
                active warranties
              </span>
              <span className="rounded-full bg-white/12 px-3 py-1">
                {tickets.length} service records
              </span>
            </div>
          </div>
          <PassportQR reference={inst.reference} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Installation details" className="lg:col-span-2">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[12px] text-muted uppercase">Owner</dt>
              <dd className="font-medium text-ink">{customer?.name}</dd>
              {view === "internal" && (
                <dd className="text-[13px] text-muted">
                  {customer?.phone} · {customer?.email ?? "no email"}
                </dd>
              )}
            </div>
            <div>
              <dt className="text-[12px] text-muted uppercase">Site</dt>
              <dd className="text-ink">
                {site?.address || "—"}, {site?.city} {site?.pin}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-muted uppercase">System</dt>
              <dd className="text-ink">
                {inst.capacity} kW {inst.systemType} · {site?.propertyType}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-muted uppercase">
                Generation at handover
              </dt>
              <dd className="text-ink">
                {inst.tests ? `${inst.tests.generationKw} kW` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-muted uppercase">Crew</dt>
              <dd className="text-ink">
                {inst.crew
                  .map((c) => byId(db.users, c.technicianId)?.name)
                  .join(", ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-muted uppercase">Sales order</dt>
              <dd className="font-mono text-[13px] text-ink">{so?.id}</dd>
            </div>
          </dl>
        </Panel>
        <Panel title="Documents">
          <ul className="space-y-1">
            {[
              {
                k: "quote" as const,
                label: "Accepted quotation",
                show: !!quote,
              },
              {
                k: "invoice" as const,
                label: "Invoice & payments",
                show: !!so,
              },
              {
                k: "handover" as const,
                label: "Installation handover report",
                show: true,
              },
            ]
              .filter((d) => d.show)
              .map((d) => (
                <li key={d.k}>
                  <button
                    type="button"
                    onClick={() => setDoc(d.k)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink hover:bg-forest/5"
                  >
                    <FileText className="h-4 w-4 text-botanical" />
                    {d.label}
                  </button>
                </li>
              ))}
          </ul>
          {view === "internal" && fin && (
            <div className="mt-3 rounded-2xl bg-forest/[0.04] p-3 text-[13px]">
              <p className="mb-1 font-medium text-ink">
                Internal: job contribution
              </p>
              <p className="text-muted">
                {inr(fin.contribution)} ({fin.marginPct}%) · outstanding{" "}
                {inr(fin.outstanding)}
              </p>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Equipment, serial numbers & warranty" bodyClass="p-0">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-forest/8 bg-[#F8FBF7] text-left text-[12px] tracking-wide text-muted uppercase">
                <th className="px-5 py-2.5 font-medium">Component</th>
                <th className="px-5 py-2.5 font-medium">Serial</th>
                <th className="px-5 py-2.5 font-medium">Warranty terms</th>
                <th className="px-5 py-2.5 font-medium">Expiry</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {warranties
                .slice()
                .sort(
                  (a, b) => Number(!!a.supersededBy) - Number(!!b.supersededBy),
                )
                .map((w) => (
                  <tr
                    key={w.id}
                    className={`border-b border-forest/6 last:border-0 ${
                      w.supersededBy ? "text-muted" : ""
                    }`}
                  >
                    <td className="px-5 py-3">
                      {productName(db, w.productId)}
                    </td>
                    <td className="px-5 py-3 font-mono text-[12.5px]">
                      {w.serial}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-muted">
                      {w.terms}
                    </td>
                    <td className="px-5 py-3">{fmtDate(w.end)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={warrantyState(w)} />
                    </td>
                  </tr>
                ))}
              {warranties.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted">
                    Warranties activate when the installation is completed and
                    accepted.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Repair & maintenance history">
          {tickets.length === 0 ? (
            <p className="text-sm text-muted">No service visits recorded.</p>
          ) : (
            <ul className="space-y-3">
              {tickets.map((t) => (
                <li key={t.id} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-forest/5 text-botanical">
                    <Wrench className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {view === "internal" ? (
                        <Link
                          to={`/app/service-tickets/${t.id}`}
                          className="font-mono text-[13px] font-medium text-botanical hover:underline"
                        >
                          {t.id}
                        </Link>
                      ) : (
                        <span className="font-mono text-[13px] font-medium">
                          {t.id}
                        </span>
                      )}
                      <StatusBadge status={t.status} />
                      {t.coverage && <StatusBadge status={t.coverage} />}
                    </div>
                    <p className="mt-0.5 text-sm text-ink">{t.issue}</p>
                    {t.repair && (
                      <p className="text-[12.5px] text-muted">
                        {t.repair.notes}
                      </p>
                    )}
                    <p className="text-[12px] text-muted">
                      {fmtDate(t.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Replacement records">
          {replacements.length === 0 ? (
            <p className="text-sm text-muted">
              No components have been replaced.
            </p>
          ) : (
            <ul className="space-y-3">
              {replacements.map((r) => (
                <li
                  key={r.id}
                  className="rounded-2xl border border-forest/8 p-3"
                >
                  <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
                    <RefreshCcw className="h-4 w-4 text-botanical" />
                    {productName(db, r.productId)}
                  </p>
                  <p className="mt-1 font-mono text-[12.5px]">
                    <span className="text-muted line-through">
                      {r.originalSerial}
                    </span>{" "}
                    →{" "}
                    <span className="text-[#17673F]">
                      {r.replacementSerial}
                    </span>
                  </p>
                  <p className="text-[12px] text-muted">
                    {fmtDate(r.at)} · ticket {r.serviceTicketId} · original
                    retained as faulty return
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Installation photographs"
        actions={
          <span className="inline-flex items-center gap-1 text-[12px] text-muted">
            <ImageIcon className="h-3.5 w-3.5" /> {inst.photos.length}
          </span>
        }
      >
        {inst.photos.length === 0 ? (
          <p className="text-sm text-muted">
            Photographs are added by the technician during installation.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {inst.photos.map((p) => (
              <li
                key={p.id}
                className="overflow-hidden rounded-2xl bg-forest/5"
              >
                <img
                  src={p.url}
                  alt={p.caption}
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                />
                <p className="truncate px-3 py-2 text-[12px] text-muted">
                  {p.caption}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="flex items-center gap-2 text-[12px] text-muted">
        {view === "customer" ? (
          <Lock className="h-3.5 w-3.5" />
        ) : (
          <BadgeCheck className="h-3.5 w-3.5" />
        )}
        {view === "customer"
          ? "Visible only to you after sign-in. The public QR link shows no personal data."
          : "Employee view — includes contact details and internal job contribution."}
      </p>

      <DocumentPreview
        open={!!doc}
        onClose={() => setDoc(null)}
        title={
          doc === "quote"
            ? `Quotation ${quote?.id}`
            : doc === "invoice"
              ? `Invoice for ${so?.id}`
              : `Handover report ${inst.reference}`
        }
        html={docHtml}
        filename={`${doc}-${inst.reference}.html`}
      />
    </div>
  )
}
