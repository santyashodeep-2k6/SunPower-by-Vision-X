import { useState } from "react"
import { Link, useParams } from "react-router"
import { CalendarClock, FileText, HardHat, QrCode } from "lucide-react"
import type { SubsidyTracking, TechnicianAssignment } from "@/lib/types"
import {
  addDays,
  fmtDate,
  fmtDateTime,
  fmtTime,
  inr,
  toInputDateTime,
} from "@/lib/format"
import { handoverHtml } from "@/lib/documents"
import { installationMissing, isDelayed } from "@/lib/rules"
import { useDb } from "@/data/store"
import { scheduleInstallation, updateSubsidy } from "@/services/operations"
import { useAction } from "@/lib/useAction"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button, ButtonLink } from "@/components/ui/Button"
import { Callout, EmptyState, StatusBadge } from "@/components/ui/feedback"
import { KeyValueGrid, Panel } from "@/components/ui/data"
import {
  Checkbox,
  DatePicker,
  FormField,
  SelectInput,
} from "@/components/ui/forms"
import { Modal } from "@/components/ui/overlays"
import { DocumentPreview } from "@/components/special/DocumentPreview"
import { InstallationProgressTracker } from "@/components/special/InstallationProgressTracker"
import { TechnicianChecklist } from "@/components/special/TechnicianChecklist"

export function ScheduleModal({
  open,
  onClose,
  instId,
}: {
  open: boolean
  onClose: () => void
  instId: string
}) {
  const db = useDb()
  const { run, pending } = useAction()
  const inst = db.installations.find((i) => i.id === instId)!
  const techs = db.users.filter((u) => u.role === "installer" && u.active)
  const [start, setStart] = useState(
    toInputDateTime(
      inst.scheduledAt ??
        addDays(new Date(), 1).replace(/T.*/, "T03:30:00.000Z"),
    ),
  )
  const [end, setEnd] = useState(
    toInputDateTime(
      inst.expectedCompletion ??
        addDays(new Date(), 2).replace(/T.*/, "T12:30:00.000Z"),
    ),
  )
  const [lead, setLead] = useState(
    inst.crew.find((c) => c.role === "Lead")?.technicianId ?? "U-07",
  )
  const [crew, setCrew] = useState<string[]>(
    inst.crew
      .filter((c) => c.role === "Crew")
      .map((c) => c.technicianId)
      .concat(inst.crew.length ? [] : ["U-08"]),
  )
  const busy = (id: string) =>
    db.installations.filter(
      (i) =>
        i.id !== instId &&
        ["Scheduled", "In Progress", "Paused"].includes(i.status) &&
        i.crew.some((c) => c.technicianId === id),
    ).length
  const save = () => {
    const assignment: TechnicianAssignment[] = [
      { technicianId: lead, role: "Lead" },
      ...crew
        .filter((c) => c !== lead)
        .map((c) => ({ technicianId: c, role: "Crew" as const })),
    ]
    return run(
      "sched",
      () =>
        scheduleInstallation(instId, {
          scheduledAt: new Date(start).toISOString(),
          expectedCompletion: new Date(end).toISOString(),
          crew: assignment,
        }),
      "Installation scheduled",
    )
      .then(onClose)
      .catch(() => undefined)
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Schedule ${inst.reference}`}
      description="Allocate a lead technician and crew."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={pending === "sched"}
            onClick={save}
          >
            Save schedule
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Start" required>
            <DatePicker
              withTime
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </FormField>
          <FormField label="Expected completion" required>
            <DatePicker
              withTime
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </FormField>
        </div>
        <FormField label="Lead technician" required>
          <SelectInput
            value={lead}
            onChange={(e) => setLead(e.target.value)}
            options={techs.map((t) => ({
              value: t.id,
              label: `${t.name} (${busy(t.id)} active jobs)`,
            }))}
          />
        </FormField>
        <div>
          <p className="mb-2 text-[13px] font-medium text-ink">Crew</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {techs
              .filter((t) => t.id !== lead)
              .map((t) => (
                <Checkbox
                  key={t.id}
                  checked={crew.includes(t.id)}
                  onChange={(v) =>
                    setCrew(
                      v ? [...crew, t.id] : crew.filter((x) => x !== t.id),
                    )
                  }
                  label={t.name}
                  description={`${busy(t.id)} active jobs`}
                />
              ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function InstallationDetailPage() {
  const { id } = useParams()
  const db = useDb()
  const { fire } = useAction()
  const [modal, setModal] = useState<null | "schedule" | "report">(null)
  const inst = db.installations.find((i) => i.id === id)
  if (!inst)
    return (
      <EmptyState
        title="Installation not found"
        action={
          <ButtonLink to="/app/installations" variant="dark" size="sm">
            Back
          </ButtonLink>
        }
      />
    )
  const c = db.customers.find((x) => x.id === inst.customerId)!
  const site = db.sites.find((s) => s.id === inst.siteId)!
  const missing = installationMissing(db, inst)
  const subsidy = db.subsidies.find((s) => s.installationId === inst.id)
  const warranties = db.warranties.filter(
    (w) => w.installationId === inst.id && !w.supersededBy,
  )
  return (
    <>
      <PageHeader
        back={{ to: "/app/installations", label: "Installations" }}
        eyebrow={`${inst.id} · order ${inst.salesOrderId}`}
        title={`${inst.reference} — ${c.name}`}
        badges={
          <>
            <StatusBadge status={inst.status} />
            {isDelayed(inst) && <StatusBadge status="Delayed" />}
          </>
        }
        description={`${inst.capacity} kW ${inst.systemType} · ${site.address}, ${site.city}`}
        actions={
          <>
            <Button
              size="sm"
              icon={<CalendarClock className="h-4 w-4" />}
              disabledReason={inst.status === "Completed" && "Job is completed"}
              onClick={() => setModal("schedule")}
            >
              {inst.scheduledAt ? "Reschedule / crew" : "Schedule"}
            </Button>
            <Button
              size="sm"
              icon={<FileText className="h-4 w-4" />}
              onClick={() => setModal("report")}
            >
              {inst.status === "Completed"
                ? "Handover report"
                : "Report preview"}
            </Button>
            <ButtonLink
              size="sm"
              to={`/app/passport/${inst.reference}`}
              icon={<QrCode className="h-4 w-4" />}
            >
              Asset passport
            </ButtonLink>
            {inst.status !== "Completed" && (
              <ButtonLink
                size="sm"
                variant="dark"
                to={`/app/technician?job=${inst.id}`}
                icon={<HardHat className="h-4 w-4" />}
              >
                Technician worksheet
              </ButtonLink>
            )}
          </>
        }
      />
      {inst.status === "Awaiting Materials" && (
        <Callout tone="warning" className="mb-5">
          Materials are not yet delivered. You can schedule now, but the job
          cannot start until delivery is confirmed.
        </Callout>
      )}
      <Panel title="Progress" className="mb-5">
        <InstallationProgressTracker db={db} inst={inst} />
      </Panel>
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Checklist" className="lg:col-span-1">
          <TechnicianChecklist
            inst={inst}
            onToggle={() => undefined}
            disabled
          />
        </Panel>
        <div className="space-y-5 lg:col-span-2">
          <Panel title="Completion report">
            {inst.status === "Completed" ? (
              <Callout
                tone="success"
                title={`Completed ${fmtDateTime(inst.completedAt)}`}
              >
                Signed by {inst.signature?.name}. {warranties.length} warranty
                records active.
              </Callout>
            ) : missing.length ? (
              <Callout tone="warning" title="Mandatory items outstanding">
                {missing.join(" · ")}
              </Callout>
            ) : (
              <Callout tone="success">
                All evidence captured — the technician can submit the completion
                report.
              </Callout>
            )}
            <div className="mt-4">
              <KeyValueGrid
                columns={3}
                items={[
                  { label: "Scheduled", value: fmtDateTime(inst.scheduledAt) },
                  {
                    label: "Expected",
                    value: fmtDateTime(inst.expectedCompletion),
                  },
                  {
                    label: "Crew",
                    value:
                      inst.crew
                        .map(
                          (x) =>
                            `${db.users.find((u) => u.id === x.technicianId)?.name}${
                              x.role === "Lead" ? " (lead)" : ""
                            }`,
                        )
                        .join(", ") || undefined,
                  },
                  {
                    label: "Generation",
                    value: inst.tests
                      ? `${inst.tests.generationKw} kW`
                      : undefined,
                  },
                  {
                    label: "Insulation / earthing",
                    value: inst.tests
                      ? `${inst.tests.insulationMOhm} MΩ / ${inst.tests.earthingOhm} Ω`
                      : undefined,
                  },
                  {
                    label: "Serials verified",
                    value: `${inst.verifiedSerials.length}`,
                  },
                ]}
              />
            </div>
          </Panel>
          <Panel title="Photographs">
            {inst.photos.length === 0 ? (
              <p className="text-sm text-muted">
                No photographs yet — uploaded from the technician workspace.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {inst.photos.map((p) => (
                  <li key={p.id}>
                    <img
                      src={p.url}
                      alt={p.caption}
                      className="aspect-[4/3] w-full rounded-xl object-cover"
                    />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <div className="grid gap-5 md:grid-cols-2">
            <Panel title="Timesheets">
              {inst.timesheets.length === 0 ? (
                <p className="text-sm text-muted">
                  Recorded when the job starts.
                </p>
              ) : (
                <ul className="space-y-1.5 text-[13px]">
                  {inst.timesheets.map((t) => (
                    <li key={t.id} className="flex justify-between gap-2">
                      <span>
                        {db.users.find((u) => u.id === t.technicianId)?.name}
                      </span>
                      <span className="text-muted">
                        {fmtDate(t.start)} {fmtTime(t.start)}–
                        {t.end ? fmtTime(t.end) : "running"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Subsidy tracking">
              {subsidy ? (
                <div className="space-y-3 text-sm">
                  <p>
                    {subsidy.scheme} · {inr(subsidy.amount)}
                  </p>
                  <SelectInput
                    aria-label="Subsidy status"
                    value={subsidy.status}
                    onChange={(e) =>
                      fire(
                        "sub",
                        () =>
                          updateSubsidy(
                            subsidy.id,
                            e.target.value as SubsidyTracking["status"],
                          ),
                        "Subsidy status updated",
                      )
                    }
                    options={[
                      "Not Applied",
                      "Applied",
                      "Inspection",
                      "Approved",
                      "Disbursed",
                    ]}
                  />
                  <p className="text-[12px] text-muted">
                    Sample tracking only — official status comes from the scheme
                    portal.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  {inst.systemType === "On-Grid"
                    ? "Created for residential On-Grid systems at completion."
                    : "Not applicable for Off-Grid systems."}
                </p>
              )}
            </Panel>
          </div>
          <p className="text-[13px] text-muted">
            Customer:{" "}
            <Link
              to={`/app/leads?q=${encodeURIComponent(c.name)}`}
              className="text-botanical hover:underline"
            >
              {c.name}
            </Link>{" "}
            · {c.phone}
          </p>
        </div>
      </div>
      {modal === "schedule" && (
        <ScheduleModal open onClose={() => setModal(null)} instId={inst.id} />
      )}
      <DocumentPreview
        open={modal === "report"}
        onClose={() => setModal(null)}
        title={`Handover report ${inst.reference}`}
        html={handoverHtml(db, inst)}
        filename={`handover-${inst.reference}.html`}
      />
    </>
  )
}
