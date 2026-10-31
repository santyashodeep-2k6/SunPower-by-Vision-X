import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import {
  CalendarClock,
  CheckCircle2,
  FileText,
  RotateCcw,
  Send,
  UserCog,
  XCircle,
} from "lucide-react"
import type { Assessment } from "@/lib/types"
import { fmtDateTime, relative, toInputDateTime } from "@/lib/format"
import { useDb, useSession } from "@/data/store"
import {
  addSurveyNote,
  addSurveyPhoto,
  assignSurveyor,
  createQuotation,
  decideSurvey,
  removeSurveyPhoto,
  rescheduleSurvey,
  saveAssessment,
  submitSurvey,
} from "@/services/crm"
import { SAMPLE_PHOTOS } from "@/data/seed"
import { useAction } from "@/lib/useAction"
import { useToast } from "@/components/ui/overlays"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button, ButtonLink } from "@/components/ui/Button"
import { Callout, EmptyState, StatusBadge } from "@/components/ui/feedback"
import { KeyValueGrid, Panel } from "@/components/ui/data"
import {
  DatePicker,
  FileUploader,
  FormField,
  SelectInput,
  TextInput,
} from "@/components/ui/forms"
import { ConfirmationDialog, Modal } from "@/components/ui/overlays"
import { TextModal } from "./LeadDetailPage"

const EMPTY: Assessment = {
  roofArea: 0,
  orientation: "South",
  tilt: 18,
  shading: "Minimal",
  roofStructure: "RCC",
  electricalSetup: "Single Phase",
  cableDistance: 20,
  recommendedCapacity: 3,
  recommendedType: "On-Grid",
}

export default function SurveyDetailPage() {
  const { id } = useParams()
  const db = useDb()
  const session = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const { run, fire, pending } = useAction()
  const survey = db.surveys.find((s) => s.id === id)
  const [form, setForm] = useState<Record<keyof Assessment, string>>(() => {
    const a = survey?.assessment ?? {
      ...EMPTY,
      roofArea: db.leads.find((l) => l.id === survey?.leadId)?.roofArea ?? 0,
      recommendedCapacity:
        db.leads.find((l) => l.id === survey?.leadId)?.preferredCapacity ?? 3,
      recommendedType:
        db.leads.find((l) => l.id === survey?.leadId)?.systemType ?? "On-Grid",
    }
    return Object.fromEntries(
      Object.entries(a).map(([k, v]) => [k, String(v || "")]),
    ) as Record<keyof Assessment, string>
  })
  const [tried, setTried] = useState(false)
  const [modal, setModal] =
    useState<null | "assign" | "reschedule" | "approve" | "reject" | "revisit" | "note">(
      null,
    )
  const [surveyorId, setSurveyorId] = useState(survey?.surveyorId ?? "")
  const [when, setWhen] = useState(toInputDateTime(survey?.scheduledAt))
  if (!survey)
    return (
      <EmptyState
        title="Survey not found"
        action={
          <ButtonLink to="/app/surveys" variant="dark" size="sm">
            Back to surveys
          </ButtonLink>
        }
      />
    )
  const c = db.customers.find((x) => x.id === survey.customerId)!
  const site = db.sites.find((x) => x.id === survey.siteId)!
  const lead = db.leads.find((l) => l.id === survey.leadId)
  const quotes = db.quotations.filter((q) => q.surveyId === survey.id)
  const editable = ["Scheduled", "Revisit Requested"].includes(survey.status)
  const canDecide = session?.role === "admin" || session?.role === "sales"

  const num = (k: keyof Assessment) => Number(form[k])
  const errors: Partial<Record<keyof Assessment, string>> = {}
  if (!(num("roofArea") > 20))
    errors.roofArea = "Measured roof area is required (sq ft)."
  if (!(num("tilt") >= 0 && num("tilt") <= 60))
    errors.tilt = "Tilt must be between 0° and 60°."
  if (!(num("cableDistance") > 0 && num("cableDistance") <= 200))
    errors.cableDistance = "Cable distance must be 1–200 m."
  const roofTight =
    num("roofArea") > 0 && num("recommendedCapacity") * 80 > num("roofArea")
  const assessment = (): Assessment => ({
    roofArea: num("roofArea"),
    orientation: form.orientation as Assessment["orientation"],
    tilt: num("tilt"),
    shading: form.shading as Assessment["shading"],
    roofStructure: form.roofStructure as Assessment["roofStructure"],
    electricalSetup: form.electricalSetup as Assessment["electricalSetup"],
    cableDistance: num("cableDistance"),
    recommendedCapacity: num("recommendedCapacity"),
    recommendedType: form.recommendedType as Assessment["recommendedType"],
  })
  const valid = Object.keys(errors).length === 0
  const save = async (andSubmit: boolean) => {
    setTried(true)
    if (!valid)
      return toast({ tone: "error", title: "Check the highlighted fields" })
    await run(
      "save",
      () => saveAssessment(survey.id, assessment()),
      andSubmit ? undefined : "Assessment saved",
    ).catch(() => null)
    if (andSubmit)
      await run(
        "submit",
        () => submitSurvey(survey.id),
        "Submitted for approval",
      ).catch(() => null)
  }
  const quoteBlock =
    survey.status !== "Approved"
      ? `Survey is ${survey.status.toLowerCase()}. A final quotation can only be generated after approval.`
      : null
  const sel = (k: keyof Assessment, options: string[]) => (
    <SelectInput
      value={form[k]}
      disabled={!editable}
      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
      options={options}
    />
  )
  const inp = (k: keyof Assessment, suffix?: string) => (
    <TextInput
      inputMode="numeric"
      value={form[k]}
      disabled={!editable}
      onChange={(e) =>
        setForm({ ...form, [k]: e.target.value.replace(/[^\d.]/g, "") })
      }
      placeholder={suffix}
    />
  )

  return (
    <>
      <PageHeader
        back={{ to: "/app/surveys", label: "All surveys" }}
        eyebrow={`${survey.id} · lead ${survey.leadId}`}
        title={`Site survey — ${c.name}`}
        badges={<StatusBadge status={survey.status} />}
        description={`${fmtDateTime(survey.scheduledAt)} · ${db.users.find((u) => u.id === survey.surveyorId)?.name ?? "No surveyor assigned"}`}
        actions={
          <>
            <Button
              size="sm"
              icon={<UserCog className="h-4 w-4" />}
              onClick={() => setModal("assign")}
              disabledReason={
                !editable && "Surveyor can only change before submission"
              }
            >
              Assign surveyor
            </Button>
            <Button
              size="sm"
              icon={<CalendarClock className="h-4 w-4" />}
              onClick={() => setModal("reschedule")}
              disabledReason={
                !editable &&
                `A ${survey.status.toLowerCase()} survey cannot be rescheduled`
              }
            >
              {survey.status === "Revisit Requested"
                ? "Schedule revisit"
                : "Reschedule"}
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<FileText className="h-4 w-4" />}
              disabledReason={quoteBlock}
              loading={pending === "quote"}
              onClick={() =>
                run(
                  "quote",
                  () => createQuotation(survey.id),
                  (q) => `Draft ${q} created`,
                )
                  .then((q) => navigate(`/app/quotations/${q}`))
                  .catch(() => undefined)
              }
            >
              Create quotation
            </Button>
          </>
        }
      />

      {survey.status === "Pending Approval" && (
        <Callout
          tone="warning"
          title="Awaiting approval — quotation is locked"
          className="mb-5"
          action={
            canDecide ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={() => setModal("approve")}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  icon={<RotateCcw className="h-4 w-4" />}
                  onClick={() => setModal("revisit")}
                >
                  Revisit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={<XCircle className="h-4 w-4" />}
                  onClick={() => setModal("reject")}
                >
                  Reject
                </Button>
              </div>
            ) : undefined
          }
        >
          {canDecide
            ? "Review the assessment and photographs, then approve to unlock the quotation."
            : "A Sales or Admin user must approve this survey."}
        </Callout>
      )}
      {survey.status === "Approved" && (
        <Callout
          tone="success"
          title="Survey approved — quotation unlocked"
          className="mb-5"
        >
          {survey.decisionNote ?? "Approved."}{" "}
          {quotes.length > 0 && (
            <>
              Quotations:{" "}
              {quotes.map((q) => (
                <Link
                  key={q.id}
                  to={`/app/quotations/${q.id}`}
                  className="ml-1 font-mono underline"
                >
                  {q.id}
                </Link>
              ))}
            </>
          )}
        </Callout>
      )}
      {survey.status === "Rejected" && (
        <Callout tone="danger" title="Survey rejected" className="mb-5">
          {survey.decisionNote}
        </Callout>
      )}
      {survey.status === "Revisit Requested" && (
        <Callout tone="warning" title="Revisit requested" className="mb-5">
          {survey.decisionNote} — update the assessment and resubmit.
        </Callout>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel
            title="Technical assessment"
            description={
              editable
                ? "Measured on site. Saved drafts can be completed later."
                : "Locked after submission."
            }
            actions={
              editable && (
                <>
                  <Button
                    size="sm"
                    loading={pending === "save"}
                    onClick={() => save(false)}
                  >
                    Save draft
                  </Button>
                  <Button
                    size="sm"
                    variant="dark"
                    icon={<Send className="h-4 w-4" />}
                    loading={pending === "submit"}
                    onClick={() => save(true)}
                  >
                    Submit for approval
                  </Button>
                </>
              )
            }
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                label="Roof area (sq ft)"
                required
                error={tried ? errors.roofArea : undefined}
              >
                {inp("roofArea", "sq ft")}
              </FormField>
              <FormField label="Orientation" required>
                {sel("orientation", [
                  "South",
                  "South-East",
                  "South-West",
                  "East",
                  "West",
                  "Flat",
                ])}
              </FormField>
              <FormField
                label="Tilt angle (°)"
                required
                error={tried ? errors.tilt : undefined}
              >
                {inp("tilt", "°")}
              </FormField>
              <FormField label="Shading" required>
                {sel("shading", ["None", "Minimal", "Partial", "Heavy"])}
              </FormField>
              <FormField label="Roof structure" required>
                {sel("roofStructure", [
                  "RCC",
                  "Metal Sheet",
                  "Asbestos",
                  "Tiled",
                ])}
              </FormField>
              <FormField label="Electrical setup" required>
                {sel("electricalSetup", ["Single Phase", "Three Phase"])}
              </FormField>
              <FormField
                label="Cable distance (m)"
                required
                error={tried ? errors.cableDistance : undefined}
              >
                {inp("cableDistance", "m")}
              </FormField>
              <FormField label="Recommended capacity" required>
                <SelectInput
                  value={form.recommendedCapacity}
                  disabled={!editable}
                  onChange={(e) =>
                    setForm({ ...form, recommendedCapacity: e.target.value })
                  }
                  options={["1", "2", "3", "4", "5"].map((v) => ({
                    value: v,
                    label: `${v} kW`,
                  }))}
                />
              </FormField>
              <FormField label="Recommended system" required>
                {sel("recommendedType", ["On-Grid", "Off-Grid"])}
              </FormField>
            </div>
            {roofTight && (
              <Callout tone="warning" className="mt-4">
                Roof area may be tight: allow roughly 80 sq ft per kW (
                {num("recommendedCapacity") * 80} sq ft for{" "}
                {num("recommendedCapacity")} kW).
              </Callout>
            )}
            {form.shading === "Heavy" && (
              <Callout tone="warning" className="mt-4">
                Heavy shading significantly reduces generation — consider
                recommending rejection or a smaller array.
              </Callout>
            )}
          </Panel>
          <Panel
            title="Site photographs"
            description="At least one photograph is required before submission."
          >
            <FileUploader
              photos={survey.photos}
              disabled={!editable}
              onAdd={(p) =>
                run("photo", () => addSurveyPhoto(survey.id, p), "Photo added")
              }
              onRemove={(pid) =>
                fire("photo", () => removeSurveyPhoto(survey.id, pid))
              }
              samplePhotos={SAMPLE_PHOTOS.roof.map((url, i) => ({
                url,
                caption: i ? "Meter & cable route" : "Roof overview",
              }))}
              onError={(m) => toast({ tone: "error", title: m })}
            />
            {!editable && survey.photos.length === 0 && (
              <p className="text-sm text-muted">No photographs.</p>
            )}
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel title="Customer & site">
            <KeyValueGrid
              columns={2}
              items={[
                { label: "Customer", value: c.name },
                { label: "Mobile", value: c.phone },
                { label: "Address", value: site.address },
                { label: "City", value: `${site.city} ${site.pin}` },
                {
                  label: "Monthly bill",
                  value: lead?.monthlyBill ? `₹${lead.monthlyBill}` : undefined,
                },
                {
                  label: "Requested",
                  value: lead?.preferredCapacity
                    ? `${lead.preferredCapacity} kW ${lead.systemType ?? ""}`
                    : "Recommend",
                },
              ]}
            />
            {lead && (
              <Link
                to={`/app/leads/${lead.id}`}
                className="mt-4 block text-[13px] font-medium text-botanical hover:underline"
              >
                Open lead {lead.id}
              </Link>
            )}
          </Panel>
          <Panel
            title="Survey notes"
            actions={
              <Button size="sm" onClick={() => setModal("note")}>
                Add note
              </Button>
            }
          >
            {survey.notes.length === 0 ? (
              <p className="text-sm text-muted">No notes.</p>
            ) : (
              <ul className="space-y-3">
                {survey.notes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-xl bg-forest/[0.04] p-3 text-sm"
                  >
                    {n.text}
                    <p className="mt-1 text-[12px] text-muted">
                      {n.authorName} · {relative(n.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <Modal
        open={modal === "assign"}
        onClose={() => setModal(null)}
        size="sm"
        title="Assign surveyor"
        footer={
          <Button
            variant="dark"
            disabled={!surveyorId}
            loading={pending === "assign"}
            onClick={() =>
              run(
                "assign",
                () => assignSurveyor(survey.id, surveyorId),
                "Surveyor assigned",
              )
                .then(() => setModal(null))
                .catch(() => undefined)
            }
          >
            Save
          </Button>
        }
      >
        <FormField label="Surveyor" required>
          <SelectInput
            value={surveyorId}
            onChange={(e) => setSurveyorId(e.target.value)}
            placeholder="Select…"
            options={db.users
              .filter((u) => u.role === "surveyor")
              .map((u) => ({ value: u.id, label: u.name }))}
          />
        </FormField>
      </Modal>
      <Modal
        open={modal === "reschedule"}
        onClose={() => setModal(null)}
        size="sm"
        title="Reschedule survey"
        footer={
          <Button
            variant="dark"
            loading={pending === "resched"}
            onClick={() =>
              run(
                "resched",
                () => rescheduleSurvey(survey.id, new Date(when).toISOString()),
                "Survey rescheduled",
              )
                .then(() => setModal(null))
                .catch(() => undefined)
            }
          >
            Save
          </Button>
        }
      >
        <FormField label="New date & time" required>
          <DatePicker
            withTime
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        </FormField>
      </Modal>
      <ConfirmationDialog
        open={modal === "approve"}
        onClose={() => setModal(null)}
        title="Approve survey?"
        description="Approval unlocks quotation generation for this lead."
        confirmLabel="Approve survey"
        reasonLabel="Approval note (optional)"
        onConfirm={(n) =>
          run(
            "decide",
            () => decideSurvey(survey.id, "approve", n),
            "Survey approved — quotation unlocked",
          )
        }
      />
      <ConfirmationDialog
        open={modal === "reject"}
        onClose={() => setModal(null)}
        tone="danger"
        title="Reject survey?"
        description="The site is not feasible. The lead will be marked lost."
        confirmLabel="Reject"
        reasonLabel="Reason"
        reasonRequired
        onConfirm={(n) =>
          run(
            "decide",
            () => decideSurvey(survey.id, "reject", n),
            "Survey rejected",
          )
        }
      />
      <ConfirmationDialog
        open={modal === "revisit"}
        onClose={() => setModal(null)}
        tone="dark"
        title="Request a revisit?"
        description="The surveyor will update the assessment after another visit."
        confirmLabel="Request revisit"
        reasonLabel="What needs checking?"
        reasonRequired
        onConfirm={(n) =>
          run(
            "decide",
            () => decideSurvey(survey.id, "revisit", n),
            "Revisit requested",
          )
        }
      />
      <TextModal
        open={modal === "note"}
        onClose={() => setModal(null)}
        title="Add survey note"
        label="Note"
        confirm="Save note"
        onSave={(t) =>
          run("note", () => addSurveyNote(survey.id, t), "Note added")
        }
      />
    </>
  )
}
