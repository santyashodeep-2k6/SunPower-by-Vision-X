import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { ArrowRight, Check, ChevronDown, Route } from "lucide-react"
import type { DemoDB, Role } from "@/lib/types"
import { CHECKLIST_ITEMS } from "@/lib/types"
import { DEMO_CUSTOMER } from "@/data/seed"
import { setSession } from "@/data/store"
import { signInAsRole } from "@/app/session"
import { ROLE_LABEL } from "@/app/navigation"
import { AUTO_CHECKLIST } from "@/lib/rules"

export const PROFIT_REVIEW_KEY = "sunflow360.profitability-reviewed"

interface Step {
  label: string
  done: boolean
  role: Role | "public"
  to: string
  hint: string
}

export function journeySteps(db: DemoDB): Step[] {
  const c = db.customers.find((x) => x.phone === DEMO_CUSTOMER.phone)
  const lead =
    c &&
    db.leads
      .filter((l) => l.customerId === c.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const conv =
    lead &&
    db.conversations.find(
      (x) =>
        x.leadId === lead.id &&
        x.channel === "Web Assistant" &&
        x.status === "Completed",
    )
  const survey = lead && db.surveys.find((s) => s.leadId === lead.id)
  const quote =
    lead &&
    (db.quotations.find(
      (q) => q.leadId === lead.id && q.status === "Accepted",
    ) ??
      db.quotations.find((q) => q.leadId === lead.id))
  const so = quote?.salesOrderId
    ? db.salesOrders.find((s) => s.id === quote.salesOrderId)
    : undefined
  const inst = so && db.installations.find((i) => i.id === so.installationId)
  const dispatch = so && db.dispatches.find((d) => d.salesOrderId === so.id)
  const ticket =
    c &&
    db.serviceTickets.find(
      (t) => t.customerId === c.id && t.raisedBy === "customer",
    )
  const manualDone =
    !!inst &&
    CHECKLIST_ITEMS.filter(
      (i) => !(AUTO_CHECKLIST as readonly string[]).includes(i.key),
    ).every((i) => inst.checklist[i.key])
  let reviewed = false
  try {
    reviewed = !!inst && localStorage.getItem(PROFIT_REVIEW_KEY) === inst.id
  } catch {
    /* ignore */
  }
  const leadTo = lead ? `/app/leads/${lead.id}` : "/app/leads"
  return [
    {
      label: "Customer submits enquiry",
      done: !!lead,
      role: "public",
      to: "/enquiry?demo=rahul",
      hint: "Use “Fill Rahul Sharma demo data” on the form.",
    },
    {
      label: "Lead appears in CRM",
      done: !!lead,
      role: "sales",
      to: leadTo,
      hint: "Open the lead from the Leads list.",
    },
    {
      label: "AI assistant collects missing information",
      done: !!conv,
      role: "public",
      to: "/assistant",
      hint: "Chat as Rahul with phone 9876543210 to add roof area.",
    },
    {
      label: "Salesperson reviews the lead",
      done: !!lead?.assignedTo && !!lead && lead.status !== "New",
      role: "sales",
      to: leadTo,
      hint: "Assign a salesperson and mark the lead Qualified.",
    },
    {
      label: "Survey is scheduled",
      done: !!survey,
      role: "sales",
      to: leadTo,
      hint: "Use “Schedule survey” on the lead.",
    },
    {
      label: "Survey is completed",
      done:
        !!survey && ["Pending Approval", "Approved"].includes(survey.status),
      role: "surveyor",
      to: survey ? `/app/surveys/${survey.id}` : "/app/surveys",
      hint: "Fill the technical assessment, add photos, submit.",
    },
    {
      label: "Survey is approved",
      done: survey?.status === "Approved",
      role: "admin",
      to: survey ? `/app/surveys/${survey.id}` : "/app/surveys",
      hint: "Approve — this unlocks the quotation.",
    },
    {
      label: "Quotation generated using BOM",
      done: !!quote,
      role: "sales",
      to: survey ? `/app/surveys/${survey.id}` : "/app/quotations",
      hint: "Create quotation, review BOM, then Send.",
    },
    {
      label: "Customer accepts quotation",
      done: quote?.status === "Accepted",
      role: "customer",
      to: "/portal/documents",
      hint: "Accept from the customer portal (or staff can record it).",
    },
    {
      label: "Advance payment recorded",
      done:
        !!so &&
        db.payments.some(
          (p) => p.salesOrderId === so.id && p.kind === "Advance",
        ),
      role: "sales",
      to: quote ? `/app/quotations/${quote.id}` : "/app/quotations",
      hint: "Convert to sales order and record the advance.",
    },
    {
      label: "Sales order created",
      done: !!so,
      role: "sales",
      to: quote ? `/app/quotations/${quote.id}` : "/app/orders",
      hint: "Created together with the advance.",
    },
    {
      label: "Warehouse checks stock",
      done: !!so && !["Confirmed", "Awaiting Stock"].includes(so.status),
      role: "inventory",
      to: so ? `/app/orders/${so.id}` : "/app/orders",
      hint: "Run “Check & reserve stock”.",
    },
    {
      label: "Inverter serial is recorded",
      done:
        !!dispatch &&
        dispatch.lines.some(
          (l) => l.productId.startsWith("INV") && l.serials.length > 0,
        ),
      role: "inventory",
      to: dispatch ? `/app/dispatches/${dispatch.id}` : "/app/dispatches",
      hint: "Open delivery and scan the inverter serial.",
    },
    {
      label: "Dispatch is validated",
      done: !!dispatch && dispatch.status !== "Draft",
      role: "inventory",
      to: dispatch ? `/app/dispatches/${dispatch.id}` : "/app/dispatches",
      hint: "Allocate all serials, confirm dispatch and delivery.",
    },
    {
      label: "Installation is scheduled",
      done: !!inst?.scheduledAt && !!inst.crew.length,
      role: "admin",
      to: inst ? `/app/installations/${inst.id}` : "/app/installations",
      hint: "Schedule with Arjun Patil as lead technician.",
    },
    {
      label: "Technician completes checklist",
      done: manualDone,
      role: "installer",
      to: "/app/technician",
      hint: "Start the job and tick each checklist item.",
    },
    {
      label: "Photographs are uploaded",
      done: !!inst && inst.photos.length >= 2,
      role: "installer",
      to: "/app/technician",
      hint: "Upload at least two photos.",
    },
    {
      label: "Customer accepts completed work",
      done: inst?.status === "Completed",
      role: "installer",
      to: "/app/technician",
      hint: "Verify serials, record tests, capture signature, submit.",
    },
    {
      label: "Warranty records become visible",
      done: !!inst && db.warranties.some((w) => w.installationId === inst.id),
      role: "customer",
      to: "/portal/assets",
      hint: "See them in the portal’s Assets tab.",
    },
    {
      label: "Customer raises a service complaint",
      done: !!ticket,
      role: "customer",
      to: "/portal/service",
      hint: "Raise a complaint against the inverter serial.",
    },
    {
      label: "Warranty verification is displayed",
      done: !!ticket?.coverage,
      role: "service",
      to: ticket ? `/app/service-tickets/${ticket.id}` : "/app/service-tickets",
      hint: "Assign and record diagnosis using the warranty check.",
    },
    {
      label: "Technician completes repair",
      done: !!ticket?.repair,
      role: "service",
      to: ticket ? `/app/service-tickets/${ticket.id}` : "/app/service-tickets",
      hint: "Start repair and record it.",
    },
    {
      label: "Director reviews job profitability",
      done: reviewed,
      role: "admin",
      to: "/app/reports#profitability",
      hint: "Open Rahul’s row in Project profitability.",
    },
  ]
}

export function JourneyGuide({
  db,
  defaultOpen = true,
}: {
  db: DemoDB
  defaultOpen?: boolean
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(defaultOpen)
  const steps = useMemo(() => journeySteps(db), [db])
  const done = steps.filter((s) => s.done).length
  const next = steps.findIndex((s) => !s.done)
  const go = (s: Step) => {
    if (s.role === "customer") {
      const c = db.customers.find((x) => x.phone === DEMO_CUSTOMER.phone)
      if (c) setSession({ role: "customer", customerId: c.id })
    } else if (s.role !== "public") signInAsRole(s.role)
    navigate(s.to)
  }
  return (
    <section className="glass-light overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-forest text-sunshine">
          <Route className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">
            End-to-end demo journey · Rahul Sharma, Pune · 3 kW On-Grid
          </span>
          <span className="block text-[13px] text-muted">
            {done}/{steps.length} steps complete
            {next >= 0
              ? ` · Next: ${steps[next].label}`
              : " · Journey complete"}
          </span>
        </span>
        <span className="hidden h-2 w-40 overflow-hidden rounded-full bg-forest/8 sm:block">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-emerald to-sunshine transition-all duration-700"
            style={{ width: `${(done / steps.length) * 100}%` }}
          />
        </span>
        <ChevronDown
          className={`h-5 w-5 text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <ol className="grid gap-x-6 gap-y-1 border-t border-forest/7 px-5 py-4 md:grid-cols-2 xl:grid-cols-3">
          {steps.map((s, i) => (
            <li
              key={s.label}
              className={`flex items-start gap-3 rounded-xl px-2 py-2 ${
                i === next ? "bg-sunshine/14" : ""
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  s.done
                    ? "bg-emerald text-forest"
                    : i === next
                      ? "bg-forest text-sunshine"
                      : "border border-forest/15 text-muted"
                }`}
              >
                {s.done ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  i + 1
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[13px] ${
                    s.done
                      ? "text-muted line-through decoration-forest/20"
                      : "font-medium text-ink"
                  }`}
                >
                  {s.label}
                </p>
                {i === next && (
                  <p className="text-[12px] text-muted">
                    {s.hint}{" "}
                    {s.role !== "public" && `(${ROLE_LABEL[s.role]} role)`}
                  </p>
                )}
              </div>
              {i === next && (
                <button
                  type="button"
                  onClick={() => go(s)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-forest px-3 py-1 text-[12px] font-medium text-white hover:bg-[#164b38]"
                >
                  Go <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
