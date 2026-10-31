import { useState } from "react"
import { Link } from "react-router"
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Landmark,
  Plus,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Wallet,
  Wrench,
} from "lucide-react"
import type { Lead, Quotation } from "@/lib/types"
import { fmtDate, fmtDateTime, inr, relative } from "@/lib/format"
import { handoverHtml, invoiceHtml, quotationHtml } from "@/lib/documents"
import { paidForOrder, productOf, warrantyState } from "@/lib/rules"
import {
  acceptQuotation,
  effectiveQuoteStatus,
  markQuotationViewed,
  rejectQuotation,
} from "@/services/crm"
import { confirmRepair, decideEstimate } from "@/services/aftersales"
import { useAction } from "@/lib/useAction"
import { usePortalCustomer } from "@/components/layout/PortalLayout"
import { Button, ButtonLink } from "@/components/ui/Button"
import { Callout, EmptyState, StatusBadge } from "@/components/ui/feedback"
import {
  ActivityTimeline,
  Panel,
  ProgressTimeline,
  StatCard,
  type TimelineStep,
} from "@/components/ui/data"
import { ConfirmationDialog } from "@/components/ui/overlays"
import { DocumentPreview } from "@/components/special/DocumentPreview"
import { InstallationProgressTracker } from "@/components/special/InstallationProgressTracker"
import { SolarAssetPassport } from "@/components/special/SolarAssetPassport"
import { CreateTicketModal } from "@/components/special/CreateTicketModal"

function enquirySteps(
  lead: Lead,
  hasSurvey: boolean,
  surveyApproved: boolean,
  quote?: Quotation,
): TimelineStep[] {
  const flags = [
    { label: "Enquiry received", done: true, date: fmtDate(lead.createdAt) },
    { label: "Advisor review", done: lead.status !== "New" },
    {
      label: "Site survey",
      done: surveyApproved,
      current: hasSurvey && !surveyApproved,
    },
    {
      label: "Quotation",
      done: quote?.status === "Accepted",
      current: !!quote && quote.status !== "Accepted",
    },
    { label: "Order & installation", done: lead.status === "Won" },
  ]
  let cur = false
  return flags.map((f) => {
    let state: TimelineStep["state"] = f.done ? "done" : "upcoming"
    if (!f.done && !cur) {
      state = "current"
      cur = true
    }
    return { label: f.label, state, date: f.date }
  })
}

function QuoteActions({ q }: { q: Quotation }) {
  const { db } = usePortalCustomer()
  const { run, pending } = useAction()
  const [modal, setModal] = useState<null | "view" | "accept" | "reject">(null)
  const st = effectiveQuoteStatus(q)
  const open = st === "Sent" || st === "Awaiting Response"
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        icon={<Eye className="h-4 w-4" />}
        onClick={() => {
          setModal("view")
          if (q.status === "Sent")
            markQuotationViewed(q.id).catch(() => undefined)
        }}
      >
        View
      </Button>
      {open && (
        <Button
          size="sm"
          variant="danger"
          icon={<ThumbsDown className="h-4 w-4" />}
          onClick={() => setModal("reject")}
        >
          Decline
        </Button>
      )}
      {open && (
        <Button
          size="sm"
          variant="primary"
          icon={<ThumbsUp className="h-4 w-4" />}
          loading={pending === "acc"}
          onClick={() => setModal("accept")}
        >
          Accept quotation
        </Button>
      )}
      <DocumentPreview
        open={modal === "view"}
        onClose={() => setModal(null)}
        title={`Quotation ${q.id}`}
        html={quotationHtml(db, q)}
        filename={`${q.id}.html`}
      />
      <ConfirmationDialog
        open={modal === "accept"}
        onClose={() => setModal(null)}
        title={`Accept quotation ${q.id}?`}
        description={`${q.capacity} kW ${q.systemType} for ${inr(q.totals.total)}. An advance of ${inr(q.totals.advance)} is due to confirm the order.`}
        confirmLabel="Accept"
        onConfirm={() =>
          run(
            "acc",
            () => acceptQuotation(q.id),
            "Thank you — quotation accepted. Our team will contact you for the advance payment.",
          )
        }
      />
      <ConfirmationDialog
        open={modal === "reject"}
        onClose={() => setModal(null)}
        tone="danger"
        title="Decline quotation?"
        confirmLabel="Decline"
        reasonLabel="Could you tell us why?"
        reasonRequired
        onConfirm={(r) =>
          run("rej", () => rejectQuotation(q.id, r), "Quotation declined")
        }
      />
    </div>
  )
}

export function PortalHome() {
  const { db, customer } = usePortalCustomer()
  const leads = db.leads
    .filter((l) => l.customerId === customer.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const installs = db.installations.filter((i) => i.customerId === customer.id)
  const quotes = db.quotations.filter(
    (q) =>
      q.customerId === customer.id &&
      ["Sent", "Awaiting Response"].includes(effectiveQuoteStatus(q)),
  )
  const orders = db.salesOrders.filter((s) => s.customerId === customer.id)
  const outstanding = orders.reduce(
    (s, o) => s + Math.max(0, o.total - paidForOrder(db, o.id)),
    0,
  )
  const activeW = db.warranties.filter(
    (w) =>
      w.customerId === customer.id &&
      ["Active", "Expiring Soon"].includes(warrantyState(w)),
  ).length
  const openTickets = db.serviceTickets.filter(
    (t) => t.customerId === customer.id && t.status !== "Closed",
  )
  const subsidy = db.subsidies.find((s) => s.customerId === customer.id)
  const lead = leads[0]
  const activity = db.activities
    .filter((a) => a.customerId === customer.id)
    .slice(0, 8)
  return (
    <div className="space-y-5">
      {quotes.map((q) => (
        <div
          key={q.id}
          className="glass-light flex flex-wrap items-center justify-between gap-4 p-5"
        >
          <div>
            <p className="text-sm font-semibold text-ink">
              Your quotation is ready — {q.capacity} kW {q.systemType}
            </p>
            <p className="text-[13px] text-muted">
              {q.id} · {inr(q.totals.total)} · valid until{" "}
              {fmtDate(q.validUntil)}
            </p>
          </div>
          <QuoteActions q={q} />
        </div>
      ))}
      {openTickets
        .filter(
          (t) =>
            t.status === "Awaiting Approval" ||
            (t.status === "Awaiting Confirmation" && !t.customerConfirmedAt),
        )
        .map((t) => (
          <Callout
            key={t.id}
            tone="warning"
            title={
              t.status === "Awaiting Approval"
                ? `Repair estimate needs your approval (${t.id})`
                : `Please confirm your completed repair (${t.id})`
            }
            action={
              <ButtonLink size="sm" variant="dark" to="/portal/service">
                Review
              </ButtonLink>
            }
          >
            {t.issue}
          </Callout>
        ))}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Outstanding payments"
          value={inr(outstanding)}
          icon={<Wallet className="h-4 w-4" />}
          accent={outstanding ? "amber" : "emerald"}
          to="/portal/documents"
        />
        <StatCard
          label="Active warranties"
          value={activeW}
          icon={<ShieldCheck className="h-4 w-4" />}
          accent="emerald"
          to="/portal/assets"
        />
        <StatCard
          label="Open service requests"
          value={openTickets.length}
          icon={<Wrench className="h-4 w-4" />}
          to="/portal/service"
        />
        <StatCard
          label="Subsidy status"
          value={subsidy?.status ?? "—"}
          sub={
            subsidy
              ? `${subsidy.scheme} · ${inr(subsidy.amount)}`
              : "Shown after On-Grid installation"
          }
          icon={<Landmark className="h-4 w-4" />}
          accent="gold"
        />
      </div>
      {installs.length > 0 ? (
        installs.map((i) => (
          <Panel
            key={i.id}
            title={`Installation ${i.reference}`}
            description={`${i.capacity} kW ${i.systemType} · ${i.status}`}
            actions={
              <ButtonLink size="sm" to="/portal/installations">
                Details
              </ButtonLink>
            }
          >
            <InstallationProgressTracker db={db} inst={i} />
          </Panel>
        ))
      ) : lead ? (
        <Panel
          title={`Enquiry ${lead.id}`}
          description={`Received ${relative(lead.createdAt)} · we’ll keep this page updated`}
        >
          <ProgressTimeline
            steps={enquirySteps(
              lead,
              db.surveys.some((s) => s.leadId === lead.id),
              db.surveys.some(
                (s) => s.leadId === lead.id && s.status === "Approved",
              ),
              db.quotations.find((q) => q.leadId === lead.id),
            )}
          />
        </Panel>
      ) : (
        <EmptyState
          title="No enquiries yet"
          action={
            <ButtonLink to="/enquiry" variant="dark" size="sm">
              Book a free survey
            </ButtonLink>
          }
        />
      )}
      <Panel title="Recent updates">
        <ActivityTimeline
          items={activity}
          empty="Updates about your project will appear here."
        />
      </Panel>
    </div>
  )
}

export function PortalInstallations() {
  const { db, customer } = usePortalCustomer()
  const [report, setReport] = useState<string | null>(null)
  const installs = db.installations.filter((i) => i.customerId === customer.id)
  const inst = installs.find((i) => i.id === report)
  if (!installs.length)
    return (
      <div className="surface">
        <EmptyState
          title="No installation yet"
          description="Your installation appears here once your order is confirmed."
          action={
            <ButtonLink to="/portal" size="sm">
              Back to overview
            </ButtonLink>
          }
        />
      </div>
    )
  return (
    <div className="space-y-5">
      {installs.map((i) => {
        const site = db.sites.find((s) => s.id === i.siteId)
        return (
          <div key={i.id} className="grid gap-5 lg:grid-cols-3">
            <Panel
              title={i.reference}
              description={`${i.capacity} kW ${i.systemType} · ${site?.address}, ${site?.city}`}
              className="lg:col-span-1"
            >
              <InstallationProgressTracker
                db={db}
                inst={i}
                orientation="vertical"
              />
            </Panel>
            <div className="space-y-5 lg:col-span-2">
              <Panel
                title="Schedule"
                actions={
                  i.status === "Completed" && (
                    <Button
                      size="sm"
                      icon={<FileText className="h-4 w-4" />}
                      onClick={() => setReport(i.id)}
                    >
                      Handover report
                    </Button>
                  )
                }
              >
                <dl className="grid gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-[12px] text-muted uppercase">
                      Installation date
                    </dt>
                    <dd className="text-ink">{fmtDateTime(i.scheduledAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-muted uppercase">
                      Expected completion
                    </dt>
                    <dd className="text-ink">
                      {fmtDateTime(i.expectedCompletion)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-muted uppercase">
                      Your crew
                    </dt>
                    <dd className="text-ink">
                      {i.crew
                        .map(
                          (c) =>
                            db.users
                              .find((u) => u.id === c.technicianId)
                              ?.name.split(" ")[0],
                        )
                        .join(", ") || "To be assigned"}
                    </dd>
                  </div>
                </dl>
                <StatusBadge status={i.status} className="mt-4" />
              </Panel>
              <Panel title="Photographs">
                {i.photos.length ? (
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {i.photos.map((p) => (
                      <li key={p.id}>
                        <img
                          src={p.url}
                          alt={p.caption}
                          className="aspect-[4/3] w-full rounded-xl object-cover"
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">
                    Photographs are shared after installation.
                  </p>
                )}
              </Panel>
            </div>
          </div>
        )
      })}
      {inst && (
        <DocumentPreview
          open
          onClose={() => setReport(null)}
          title={`Handover report ${inst.reference}`}
          html={handoverHtml(db, inst)}
          filename={`handover-${inst.reference}.html`}
        />
      )}
    </div>
  )
}

export function PortalDocuments() {
  const { db, customer } = usePortalCustomer()
  const [doc, setDoc] = useState<null | {
    title: string
    html: string
    file: string
  }>(null)
  const quotes = db.quotations.filter(
    (q) => q.customerId === customer.id && q.status !== "Draft",
  )
  const orders = db.salesOrders.filter((s) => s.customerId === customer.id)
  const payments = db.payments.filter((p) => p.customerId === customer.id)
  const installs = db.installations.filter(
    (i) => i.customerId === customer.id && i.status === "Completed",
  )
  return (
    <div className="space-y-5">
      <Panel title="Quotations">
        {quotes.length === 0 ? (
          <p className="text-sm text-muted">
            Quotations appear here after your site survey is approved.
          </p>
        ) : (
          <ul className="divide-y divide-forest/7">
            {quotes.map((q) => (
              <li
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <span className="text-sm">
                  <span className="font-mono">{q.id}</span> · {q.capacity} kW{" "}
                  {q.systemType} · {inr(q.totals.total)}{" "}
                  <StatusBadge
                    status={effectiveQuoteStatus(q)}
                    className="ml-1"
                  />
                </span>
                <QuoteActions q={q} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Invoices">
          {orders.length === 0 ? (
            <p className="text-sm text-muted">No invoices yet.</p>
          ) : (
            orders.map((so) => (
              <div
                key={so.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span>
                  INV-{so.id.replace("SO-", "")} · {inr(so.total)}
                  <span className="block text-[12px] text-muted">
                    Outstanding{" "}
                    {inr(Math.max(0, so.total - paidForOrder(db, so.id)))}
                  </span>
                </span>
                <Button
                  size="sm"
                  icon={<Download className="h-4 w-4" />}
                  onClick={() =>
                    setDoc({
                      title: `Invoice for ${so.id}`,
                      html: invoiceHtml(db, so),
                      file: `invoice-${so.id}.html`,
                    })
                  }
                >
                  Invoice
                </Button>
              </div>
            ))
          )}
        </Panel>
        <Panel title="Handover reports">
          {installs.length === 0 ? (
            <p className="text-sm text-muted">
              Available after installation is completed.
            </p>
          ) : (
            installs.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span className="font-mono">{i.reference}</span>
                <Button
                  size="sm"
                  icon={<FileText className="h-4 w-4" />}
                  onClick={() =>
                    setDoc({
                      title: `Handover report ${i.reference}`,
                      html: handoverHtml(db, i),
                      file: `handover-${i.reference}.html`,
                    })
                  }
                >
                  Open
                </Button>
              </div>
            ))
          )}
        </Panel>
      </div>
      <Panel title="Payments" bodyClass="p-0">
        {payments.length === 0 ? (
          <p className="p-5 text-sm text-muted">No payments recorded.</p>
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-forest/8 bg-[#F8FBF7] text-left text-[12px] text-muted uppercase">
                  <th className="px-5 py-2.5 font-medium">Date</th>
                  <th className="px-5 py-2.5 font-medium">Type</th>
                  <th className="px-5 py-2.5 font-medium">Method</th>
                  <th className="px-5 py-2.5 font-medium">Reference</th>
                  <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-forest/6 last:border-0"
                  >
                    <td className="px-5 py-2.5">{fmtDate(p.at)}</td>
                    <td className="px-5 py-2.5">{p.kind}</td>
                    <td className="px-5 py-2.5">{p.method}</td>
                    <td className="px-5 py-2.5 font-mono text-[12.5px]">
                      {p.reference}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {inr(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {doc && (
        <DocumentPreview
          open
          onClose={() => setDoc(null)}
          title={doc.title}
          html={doc.html}
          filename={doc.file}
        />
      )}
    </div>
  )
}

export function PortalAssets() {
  const { db, customer } = usePortalCustomer()
  const installs = db.installations.filter((i) => i.customerId === customer.id)
  const [sel, setSel] = useState(
    installs.find((i) => i.status === "Completed")?.id ?? installs[0]?.id,
  )
  const inst = installs.find((i) => i.id === sel)
  if (!inst)
    return (
      <div className="surface">
        <EmptyState
          title="No assets yet"
          description="Your Solar Asset Passport is created when your order is confirmed."
        />
      </div>
    )
  return (
    <div className="space-y-4">
      {installs.length > 1 && (
        <div className="flex gap-2">
          {installs.map((i) => (
            <Button
              key={i.id}
              size="sm"
              variant={i.id === sel ? "dark" : "secondary"}
              onClick={() => setSel(i.id)}
            >
              {i.reference}
            </Button>
          ))}
        </div>
      )}
      <SolarAssetPassport db={db} inst={inst} view="customer" />
    </div>
  )
}

export function PortalService() {
  const { db, customer } = usePortalCustomer()
  const { run, pending } = useAction()
  const [creating, setCreating] = useState(false)
  const [decide, setDecide] = useState<null | { id: string; approve: boolean }>(
    null,
  )
  const tickets = db.serviceTickets
    .filter((t) => t.customerId === customer.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const canRaise = db.installations.some(
    (i) => i.customerId === customer.id && i.status === "Completed",
  )
  return (
    <div className="space-y-5">
      <div className="glass-light flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="font-semibold text-ink">Need help with your system?</p>
          <p className="text-[13px] text-muted">
            Pick the component and describe the issue — we check its warranty
            before any work.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setCreating(true)}
          disabledReason={
            !canRaise && "Available after your installation is completed"
          }
        >
          Raise a complaint
        </Button>
      </div>
      {tickets.length === 0 ? (
        <div className="surface">
          <EmptyState
            icon={<Wrench className="h-5 w-5" />}
            title="No service requests"
          />
        </div>
      ) : (
        tickets.map((t) => {
          const unit = db.units.find((u) => u.serial === t.serial)
          return (
            <Panel
              key={t.id}
              title={`${t.id} · ${t.issue}`}
              description={`${
                unit
                  ? `${productOf(db, unit.productId)?.name} · ${t.serial}`
                  : "General"
              } · raised ${relative(t.createdAt)}`}
              actions={<StatusBadge status={t.status} />}
            >
              <div className="flex flex-wrap gap-2 text-[13px]">
                {t.coverage && <StatusBadge status={t.coverage} />}
                {t.assignedTo && (
                  <span className="text-muted">
                    Technician:{" "}
                    {db.users.find((u) => u.id === t.assignedTo)?.name}
                  </span>
                )}
                {t.diagnosis && (
                  <span className="text-muted">· {t.diagnosis}</span>
                )}
              </div>
              {t.status === "Awaiting Approval" && t.estimate && (
                <Callout
                  tone="warning"
                  title={`Estimate ${inr(t.estimate.amount)} — your approval is needed`}
                  className="mt-4"
                  action={
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setDecide({ id: t.id, approve: false })}
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setDecide({ id: t.id, approve: true })}
                      >
                        Approve
                      </Button>
                    </div>
                  }
                >
                  This repair is not covered by warranty. Work starts only after
                  you approve.
                </Callout>
              )}
              {t.status === "Awaiting Confirmation" &&
                !t.customerConfirmedAt && (
                  <Callout
                    tone="info"
                    title="Repair completed — please confirm"
                    className="mt-4"
                    action={
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<CheckCircle2 className="h-4 w-4" />}
                        loading={pending === t.id}
                        onClick={() =>
                          run(
                            t.id,
                            () => confirmRepair(t.id),
                            "Thanks for confirming",
                          ).catch(() => undefined)
                        }
                      >
                        Confirm repair
                      </Button>
                    }
                  >
                    {t.repair?.notes}
                  </Callout>
                )}
              {t.customerConfirmedAt && (
                <p className="mt-3 text-[13px] text-[#17673F]">
                  You confirmed this repair on {fmtDate(t.customerConfirmedAt)}.
                </p>
              )}
              <details className="mt-3">
                <summary className="cursor-pointer text-[13px] font-medium text-botanical">
                  Visit history
                </summary>
                <div className="mt-3">
                  <ActivityTimeline
                    items={t.log.map((l) => ({
                      id: l.id,
                      text: l.text,
                      actor: l.authorName,
                      at: l.at,
                    }))}
                  />
                </div>
              </details>
            </Panel>
          )
        })
      )}
      <CreateTicketModal
        open={creating}
        onClose={() => setCreating(false)}
        customerId={customer.id}
        raisedBy="customer"
      />
      <ConfirmationDialog
        open={!!decide}
        onClose={() => setDecide(null)}
        tone={decide?.approve ? "primary" : "danger"}
        title={
          decide?.approve
            ? "Approve the repair estimate?"
            : "Decline the estimate?"
        }
        description={
          decide?.approve
            ? "Our technician will schedule the repair."
            : "The request will be closed without repair."
        }
        confirmLabel={decide?.approve ? "Approve" : "Decline"}
        onConfirm={() =>
          run(
            "dec",
            () => decideEstimate(decide!.id, decide!.approve),
            decide?.approve ? "Estimate approved" : "Estimate declined",
          )
        }
      />
      <p className="text-[12px] text-muted">
        Need urgent help? Call 1800-000-360 (sample).{" "}
        <Link to="/portal/assets" className="text-botanical hover:underline">
          View warranty details
        </Link>
      </p>
    </div>
  )
}
