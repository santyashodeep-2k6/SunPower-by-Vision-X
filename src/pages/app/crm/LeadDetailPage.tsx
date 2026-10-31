import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import {
  BellRing,
  CalendarPlus,
  ChevronDown,
  ClipboardCheck,
  FileText,
  Pencil,
  RefreshCw,
  Sparkles,
  StickyNote,
  UserCheck,
} from "lucide-react"
import type { LeadStatus, PropertyType, SystemType } from "@/lib/types"
import {
  addDays,
  fmtDate,
  fmtDateTime,
  inr,
  isValidEmail,
  isValidIndianMobile,
  relative,
  toInputDateTime,
} from "@/lib/format"
import { missingLeadFields } from "@/lib/rules"
import { useDb } from "@/data/store"
import {
  addLeadNote,
  allowedLeadTransitions,
  assignLead,
  changeLeadStatus,
  createQuotation,
  regenerateLeadSummary,
  requestFollowUp,
  scheduleSurvey,
  updateLead,
} from "@/services/crm"
import { useAction } from "@/lib/useAction"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button, ButtonLink } from "@/components/ui/Button"
import { Callout, EmptyState, StatusBadge } from "@/components/ui/feedback"
import {
  ActivityTimeline,
  KeyValueGrid,
  Panel,
  Tabs,
} from "@/components/ui/data"
import {
  DatePicker,
  FormField,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/ui/forms"
import {
  ConfirmationDialog,
  DropdownMenu,
  Modal,
} from "@/components/ui/overlays"
import { ChatMessage } from "@/components/special/ChatMessage"

type Tab = "overview" | "ai" | "conversation" | "survey" | "activity"

export default function LeadDetailPage() {
  const { id } = useParams()
  const db = useDb()
  const navigate = useNavigate()
  const { run, fire, pending } = useAction()
  const [tab, setTab] = useState<Tab>("overview")
  const [modal, setModal] =
    useState<null | "edit" | "assign" | "survey" | "note" | "follow">(null)
  const [statusTarget, setStatusTarget] = useState<LeadStatus | null>(null)
  const lead = db.leads.find((l) => l.id === id)
  if (!lead)
    return (
      <EmptyState
        title="Lead not found"
        description={`No lead with ID ${id}.`}
        action={
          <ButtonLink to="/app/leads" variant="dark" size="sm">
            Back to leads
          </ButtonLink>
        }
      />
    )
  const customer = db.customers.find((c) => c.id === lead.customerId)!
  const site = db.sites.find((s) => s.id === lead.siteId)!
  const missing = missingLeadFields(lead, customer, site)
  const surveys = db.surveys.filter((s) => s.leadId === lead.id)
  const activeSurvey =
    surveys.find((s) => s.status !== "Rejected") ?? surveys[0]
  const quotes = db.quotations.filter((q) => q.leadId === lead.id)
  const convs = db.conversations.filter(
    (c) => c.leadId === lead.id || c.customerId === lead.customerId,
  )
  const activity = db.activities.filter((a) => a.customerId === lead.customerId)
  const salesperson = db.users.find((u) => u.id === lead.assignedTo)
  const quoteBlock = !activeSurvey
    ? "Schedule and approve a site survey first."
    : activeSurvey.status !== "Approved"
      ? `Survey ${activeSurvey.id} is ${activeSurvey.status.toLowerCase()} — a final quotation needs an approved survey.`
      : null
  const closed = lead.status === "Won" || lead.status === "Lost"

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "ai", label: "AI Summary" },
    { id: "conversation", label: "Conversation", count: convs.length },
    { id: "survey", label: "Survey", count: surveys.length },
    {
      id: "activity",
      label: "Activity",
      count: lead.notes.length + activity.length,
    },
  ]

  return (
    <>
      <PageHeader
        back={{ to: "/app/leads", label: "All leads" }}
        eyebrow={`${lead.id} · ${lead.source} · received ${relative(lead.createdAt)}`}
        title={customer.name}
        badges={<StatusBadge status={lead.status} />}
        description={`${site.propertyType} · ${site.city || "City missing"} · ${
          salesperson ? `Owned by ${salesperson.name}` : "Unassigned"
        }`}
        actions={
          <>
            <Button
              size="sm"
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => setModal("edit")}
            >
              Edit lead
            </Button>
            <Button
              size="sm"
              icon={<UserCheck className="h-4 w-4" />}
              onClick={() => setModal("assign")}
              disabledReason={closed && `Lead is ${lead.status.toLowerCase()}`}
            >
              Assign
            </Button>
            <Button
              size="sm"
              icon={<CalendarPlus className="h-4 w-4" />}
              onClick={() => setModal("survey")}
              disabledReason={
                closed
                  ? `Lead is ${lead.status.toLowerCase()}`
                  : activeSurvey && activeSurvey.status !== "Rejected"
                    ? `Survey ${activeSurvey.id} already exists (${activeSurvey.status})`
                    : null
              }
            >
              Schedule survey
            </Button>
            <DropdownMenu
              items={[
                {
                  label: "Add internal note",
                  icon: <StickyNote className="h-4 w-4" />,
                  onSelect: () => setModal("note"),
                },
                {
                  label: "Request follow-up",
                  icon: <BellRing className="h-4 w-4" />,
                  onSelect: () => setModal("follow"),
                  disabled: closed,
                },
                ...allowedLeadTransitions(lead.status).map((s) => ({
                  label: `Mark as ${s}`,
                  icon: <ChevronDown className="h-4 w-4 -rotate-90" />,
                  danger: s === "Lost",
                  onSelect: () => setStatusTarget(s),
                })),
              ]}
              trigger={({ toggle, open }) => (
                <Button size="sm" onClick={toggle} aria-expanded={open}>
                  More <ChevronDown className="h-4 w-4" />
                </Button>
              )}
            />
            <Button
              size="sm"
              variant="primary"
              icon={<FileText className="h-4 w-4" />}
              disabledReason={quoteBlock}
              loading={pending === "quote"}
              onClick={() =>
                run(
                  "quote",
                  () => createQuotation(activeSurvey!.id),
                  (qid) => `Draft ${qid} created from the approved survey`,
                )
                  .then((qid) => navigate(`/app/quotations/${qid}`))
                  .catch(() => undefined)
              }
            >
              Create quotation
            </Button>
          </>
        }
      />

      {missing.length > 0 && !closed && (
        <Callout
          tone="warning"
          title={`${missing.length} customer detail${
            missing.length > 1 ? "s are" : " is"
          } missing`}
          className="mb-5"
          action={
            <Button size="sm" onClick={() => setModal("edit")}>
              Complete profile
            </Button>
          }
        >
          {missing.join(" · ")}
        </Callout>
      )}
      {lead.status === "Lost" && lead.lostReason && (
        <Callout tone="danger" title="Lead lost" className="mb-5">
          {lead.lostReason}
        </Callout>
      )}

      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-5" />

      {tab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel title="Customer & site" className="lg:col-span-2">
            <KeyValueGrid
              items={[
                { label: "Customer ID", value: customer.id, mono: true },
                { label: "Mobile", value: customer.phone },
                { label: "Email", value: customer.email },
                {
                  label: "Language · contact",
                  value: `${customer.language} · ${customer.contactMethod}`,
                },
                { label: "Property type", value: site.propertyType },
                { label: "Site ID", value: site.id, mono: true },
                { label: "Address", value: site.address },
                {
                  label: "City · PIN",
                  value: site.pin ? `${site.city} ${site.pin}` : undefined,
                },
              ]}
            />
          </Panel>
          <Panel title="Requirements">
            <KeyValueGrid
              columns={2}
              items={[
                {
                  label: "Monthly bill",
                  value: lead.monthlyBill ? inr(lead.monthlyBill) : undefined,
                },
                {
                  label: "Rooftop area",
                  value: lead.roofArea ? `${lead.roofArea} sq ft` : undefined,
                },
                {
                  label: "Capacity",
                  value: lead.preferredCapacity
                    ? `${lead.preferredCapacity} kW`
                    : "Recommend",
                },
                { label: "System type", value: lead.systemType },
              ]}
            />
            {lead.requirements && (
              <p className="mt-4 rounded-xl bg-forest/[0.04] p-3 text-[13px] text-ink">
                {lead.requirements}
              </p>
            )}
            {lead.followUpAt && (
              <p className="mt-4 text-[13px] text-muted">
                Follow-up {fmtDateTime(lead.followUpAt)} (
                {relative(lead.followUpAt)})
              </p>
            )}
          </Panel>
          {quotes.length > 0 && (
            <Panel title="Quotations" className="lg:col-span-3" bodyClass="p-0">
              <ul className="divide-y divide-forest/7">
                {quotes.map((q) => (
                  <li key={q.id}>
                    <Link
                      to={`/app/quotations/${q.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-[#F6FAF5]"
                    >
                      <span className="font-mono">{q.id}</span>
                      <span>
                        {q.capacity} kW {q.systemType}
                      </span>
                      <span className="tabular-nums">
                        {inr(q.totals.total)}
                      </span>
                      <StatusBadge status={q.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}

      {tab === "ai" && (
        <Panel
          title="AI lead summary"
          description={
            lead.aiSummary
              ? `Generated ${relative(lead.aiSummary.generatedAt)} · ${
                  lead.aiSummary.engine === "demo-rules"
                    ? "Demo rule-based engine (not an AI model)"
                    : "AI model"
                }`
              : undefined
          }
          actions={
            <Button
              size="sm"
              icon={<RefreshCw className="h-4 w-4" />}
              loading={pending === "ai"}
              onClick={() =>
                fire(
                  "ai",
                  () => regenerateLeadSummary(lead.id),
                  "Summary refreshed",
                )
              }
            >
              Regenerate
            </Button>
          }
        >
          {lead.aiSummary ? (
            <div className="grid gap-6 md:grid-cols-[180px_1fr]">
              <div className="flex flex-col items-center justify-center rounded-2xl bg-forest p-5 text-white">
                <Sparkles className="h-5 w-5 text-sunshine" />
                <p className="mt-2 text-4xl font-semibold tabular-nums">
                  {lead.aiSummary.score}
                </p>
                <p className="text-[12px] text-white/70">Qualification score</p>
              </div>
              <div>
                <p className="text-[15px] leading-relaxed text-ink">
                  {lead.aiSummary.summary}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusBadge tone="success">
                    Recommended {lead.aiSummary.recommendedCapacity} kW{" "}
                    {lead.aiSummary.recommendedType}
                  </StatusBadge>
                  {lead.aiSummary.missing.map((m) => (
                    <StatusBadge key={m} tone="warning">
                      Missing: {m}
                    </StatusBadge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              compact
              title="No summary yet"
              action={
                <Button
                  size="sm"
                  onClick={() =>
                    fire("ai", () => regenerateLeadSummary(lead.id))
                  }
                >
                  Generate
                </Button>
              }
            />
          )}
        </Panel>
      )}

      {tab === "conversation" && (
        <Panel
          title="Conversations"
          actions={
            <ButtonLink to="/app/conversations" size="sm">
              Open inbox
            </ButtonLink>
          }
        >
          {convs.length === 0 ? (
            <EmptyState
              compact
              title="No conversations linked"
              description="Conversations from the website assistant or WhatsApp appear here once linked to this customer."
            />
          ) : (
            <div className="space-y-6">
              {convs.map((c) => (
                <div key={c.id}>
                  <p className="mb-3 flex items-center gap-2 text-[13px] text-muted">
                    <span className="font-mono">{c.id}</span> · {c.channel} ·{" "}
                    {c.language} <StatusBadge status={c.status} />
                  </p>
                  <div className="space-y-3 rounded-2xl bg-[#F8FBF7] p-4">
                    {c.messages.map((m) => (
                      <ChatMessage key={m.id} message={m} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {tab === "survey" && (
        <Panel title="Site survey">
          {surveys.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck className="h-5 w-5" />}
              title="No survey scheduled"
              description="A final quotation can only be generated after a survey is approved."
              action={
                <Button
                  variant="dark"
                  size="sm"
                  onClick={() => setModal("survey")}
                  disabled={closed}
                >
                  Schedule survey
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {surveys.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/app/surveys/${s.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-forest/8 p-4 hover:border-emerald/50"
                  >
                    <div>
                      <p className="font-mono text-sm font-medium">{s.id}</p>
                      <p className="text-[13px] text-muted">
                        {fmtDateTime(s.scheduledAt)} ·{" "}
                        {db.users.find((u) => u.id === s.surveyorId)?.name ??
                          "Unassigned"}
                      </p>
                    </div>
                    {s.assessment && (
                      <span className="text-sm">
                        {s.assessment.recommendedCapacity} kW{" "}
                        {s.assessment.recommendedType}
                      </span>
                    )}
                    <StatusBadge status={s.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === "activity" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel
            title="Internal notes"
            actions={
              <Button
                size="sm"
                icon={<StickyNote className="h-4 w-4" />}
                onClick={() => setModal("note")}
              >
                Add note
              </Button>
            }
          >
            {lead.notes.length === 0 ? (
              <p className="text-sm text-muted">No notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {lead.notes.map((n) => (
                  <li key={n.id} className="rounded-2xl bg-sunshine/10 p-3">
                    <p className="text-sm text-ink">{n.text}</p>
                    <p className="mt-1 text-[12px] text-muted">
                      {n.authorName} · {relative(n.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Activity">
            <ActivityTimeline items={activity} />
          </Panel>
        </div>
      )}

      <EditLeadModal
        open={modal === "edit"}
        onClose={() => setModal(null)}
        leadId={lead.id}
      />
      <AssignModal
        open={modal === "assign"}
        onClose={() => setModal(null)}
        leadId={lead.id}
        current={lead.assignedTo}
      />
      <ScheduleSurveyModal
        open={modal === "survey"}
        onClose={() => setModal(null)}
        leadId={lead.id}
      />
      <TextModal
        open={modal === "note"}
        onClose={() => setModal(null)}
        title="Add internal note"
        label="Note"
        confirm="Save note"
        onSave={(t) => run("note", () => addLeadNote(lead.id, t), "Note added")}
      />
      <FollowUpModal
        open={modal === "follow"}
        onClose={() => setModal(null)}
        leadId={lead.id}
      />
      <ConfirmationDialog
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title={`Mark lead as ${statusTarget}?`}
        description={
          statusTarget === "Lost"
            ? "The lead leaves the active pipeline. You can reopen it later."
            : `Status changes from ${lead.status} to ${statusTarget}.`
        }
        tone={statusTarget === "Lost" ? "danger" : "primary"}
        confirmLabel="Change status"
        reasonLabel={statusTarget === "Lost" ? "Reason" : undefined}
        reasonRequired={statusTarget === "Lost"}
        onConfirm={(reason) =>
          run(
            "status",
            () => changeLeadStatus(lead.id, statusTarget!, reason),
            `Lead marked ${statusTarget}`,
          )
        }
      />
    </>
  )
}

export function TextModal({
  open,
  onClose,
  title,
  label,
  confirm,
  onSave,
}: {
  open: boolean
  onClose: () => void
  title: string
  label: string
  confirm: string
  onSave: (t: string) => Promise<unknown>
}) {
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="dark"
            loading={busy}
            disabled={!text.trim()}
            onClick={async () => {
              setBusy(true)
              try {
                await onSave(text)
                setText("")
                onClose()
              } catch {
                /* toast shown */
              } finally {
                setBusy(false)
              }
            }}
          >
            {confirm}
          </Button>
        </>
      }
    >
      <FormField label={label} required>
        <TextArea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </FormField>
    </Modal>
  )
}

function EditLeadModal({
  open,
  onClose,
  leadId,
}: {
  open: boolean
  onClose: () => void
  leadId: string
}) {
  const db = useDb()
  const { run, pending } = useAction()
  const lead = db.leads.find((l) => l.id === leadId)!
  const c = db.customers.find((x) => x.id === lead.customerId)!
  const s = db.sites.find((x) => x.id === lead.siteId)!
  const init = () => ({
    name: c.name,
    phone: c.phone,
    email: c.email ?? "",
    language: c.language,
    propertyType: s.propertyType,
    address: s.address,
    city: s.city,
    pin: s.pin,
    monthlyBill: String(lead.monthlyBill ?? ""),
    roofArea: String(lead.roofArea ?? ""),
    preferredCapacity: String(lead.preferredCapacity ?? ""),
    systemType: lead.systemType ?? "",
    requirements: lead.requirements ?? "",
  })
  const [f, setF] = useState(init)
  const [key, setKey] = useState(open)
  if (open !== key) {
    setKey(open)
    if (open) setF(init())
  }
  const errs = {
    name: f.name.trim().length < 2 ? "Name is required." : undefined,
    phone: !isValidIndianMobile(f.phone)
      ? "Enter a valid Indian mobile number."
      : undefined,
    email: f.email && !isValidEmail(f.email) ? "Invalid email." : undefined,
    pin:
      f.pin && !/^[1-9]\d{5}$/.test(f.pin)
        ? "PIN must be 6 digits."
        : undefined,
  }
  const invalid = Object.values(errs).some(Boolean)
  const save = () =>
    run(
      "edit",
      () =>
        updateLead(leadId, {
          ...f,
          propertyType: f.propertyType as PropertyType,
          systemType: (f.systemType || undefined) as SystemType | undefined,
          monthlyBill: Number(f.monthlyBill) || undefined,
          roofArea: Number(f.roofArea) || undefined,
          preferredCapacity: Number(f.preferredCapacity) || undefined,
        }),
      "Lead updated",
    )
      .then(onClose)
      .catch(() => undefined)
  const field = (k: keyof typeof f) => ({
    value: f[k],
    onChange: (e: { target: { value: string } }) =>
      setF({ ...f, [k]: e.target.value }),
  })
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Edit lead"
      description="Updates the shared customer, site and lead records."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={invalid}
            loading={pending === "edit"}
            onClick={save}
          >
            Save changes
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name" required error={errs.name}>
          <TextInput {...field("name")} />
        </FormField>
        <FormField label="Mobile" required error={errs.phone}>
          <TextInput {...field("phone")} />
        </FormField>
        <FormField label="Email" error={errs.email}>
          <TextInput type="email" {...field("email")} />
        </FormField>
        <FormField label="Language">
          <SelectInput
            {...field("language")}
            options={["English", "Hindi", "Marathi"]}
          />
        </FormField>
        <FormField label="Property type">
          <SelectInput
            {...field("propertyType")}
            options={["Residential", "Commercial", "Industrial"]}
          />
        </FormField>
        <FormField label="City">
          <TextInput {...field("city")} />
        </FormField>
        <FormField label="Address" className="sm:col-span-2">
          <TextInput {...field("address")} />
        </FormField>
        <FormField label="PIN code" error={errs.pin}>
          <TextInput inputMode="numeric" maxLength={6} {...field("pin")} />
        </FormField>
        <FormField label="Monthly bill (₹)">
          <TextInput inputMode="numeric" {...field("monthlyBill")} />
        </FormField>
        <FormField label="Rooftop area (sq ft)">
          <TextInput inputMode="numeric" {...field("roofArea")} />
        </FormField>
        <FormField label="Preferred capacity">
          <SelectInput
            {...field("preferredCapacity")}
            placeholder="Recommend"
            options={["1", "2", "3", "4", "5"].map((v) => ({
              value: v,
              label: `${v} kW`,
            }))}
          />
        </FormField>
        <FormField label="System type">
          <SelectInput
            {...field("systemType")}
            placeholder="Not decided"
            options={["On-Grid", "Off-Grid"]}
          />
        </FormField>
        <FormField label="Requirements" className="sm:col-span-2">
          <TextArea {...field("requirements")} />
        </FormField>
      </div>
    </Modal>
  )
}

function AssignModal({
  open,
  onClose,
  leadId,
  current,
}: {
  open: boolean
  onClose: () => void
  leadId: string
  current?: string
}) {
  const db = useDb()
  const { run, pending } = useAction()
  const [user, setUser] = useState(current ?? "")
  const options = db.users
    .filter((u) => (u.role === "sales" || u.role === "admin") && u.active)
    .map((u) => ({
      value: u.id,
      label: `${u.name} — ${u.title} (${db.leads.filter((l) => l.assignedTo === u.id && !["Won", "Lost"].includes(l.status)).length} open)`,
    }))
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Assign salesperson"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="dark"
            disabled={!user}
            loading={pending === "assign"}
            onClick={() =>
              run(
                "assign",
                () => assignLead(leadId, user),
                "Salesperson assigned",
              )
                .then(onClose)
                .catch(() => undefined)
            }
          >
            Assign
          </Button>
        </>
      }
    >
      <FormField label="Salesperson" required>
        <SelectInput
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="Select…"
          options={options}
        />
      </FormField>
    </Modal>
  )
}

export function ScheduleSurveyModal({
  open,
  onClose,
  leadId,
}: {
  open: boolean
  onClose: () => void
  leadId: string
}) {
  const db = useDb()
  const navigate = useNavigate()
  const { run, pending } = useAction()
  const [surveyor, setSurveyor] = useState("U-04")
  const [at, setAt] = useState(() =>
    toInputDateTime(addDays(new Date(), 2).replace(/T.*/, "T05:30:00.000Z")),
  )
  const load = (uid: string) =>
    db.surveys.filter((s) => s.surveyorId === uid && s.status === "Scheduled")
      .length
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Schedule site survey"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={pending === "survey"}
            onClick={() =>
              run(
                "survey",
                () =>
                  scheduleSurvey(leadId, surveyor, new Date(at).toISOString()),
                (sid) => `Survey ${sid} scheduled`,
              )
                .then((sid) => (onClose(), navigate(`/app/surveys/${sid}`)))
                .catch(() => undefined)
            }
          >
            Schedule
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Surveyor" required>
          <SelectInput
            value={surveyor}
            onChange={(e) => setSurveyor(e.target.value)}
            options={db.users
              .filter((u) => u.role === "surveyor" && u.active)
              .map((u) => ({
                value: u.id,
                label: `${u.name} (${load(u.id)} scheduled)`,
              }))}
          />
        </FormField>
        <FormField
          label="Date & time"
          required
          hint={`Customer will be notified. ${fmtDate(at)}`}
        >
          <DatePicker
            withTime
            value={at}
            onChange={(e) => setAt(e.target.value)}
          />
        </FormField>
      </div>
    </Modal>
  )
}

function FollowUpModal({
  open,
  onClose,
  leadId,
}: {
  open: boolean
  onClose: () => void
  leadId: string
}) {
  const { run, pending } = useAction()
  const [at, setAt] = useState(() => toInputDateTime(addDays(new Date(), 1)))
  const [note, setNote] = useState("")
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Request follow-up"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="dark"
            loading={pending === "fu"}
            onClick={() =>
              run(
                "fu",
                () => requestFollowUp(leadId, new Date(at).toISOString(), note),
                "Follow-up scheduled",
              )
                .then(() => (setNote(""), onClose()))
                .catch(() => undefined)
            }
          >
            Schedule follow-up
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="When" required>
          <DatePicker
            withTime
            value={at}
            onChange={(e) => setAt(e.target.value)}
          />
        </FormField>
        <FormField label="Note" optional>
          <TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Customer will share electricity bill photo"
          />
        </FormField>
      </div>
    </Modal>
  )
}
