import { useState } from "react"
import { Link, useSearchParams } from "react-router"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  Pause,
  Phone,
  Play,
} from "lucide-react"
import type { TestResults } from "@/lib/types"
import { fmtDate, fmtDateTime, fmtTime } from "@/lib/format"
import { handoverHtml } from "@/lib/documents"
import {
  installationEvidence,
  installationMissing,
  installationProgress,
  productOf,
} from "@/lib/rules"
import { SAMPLE_PHOTOS } from "@/data/seed"
import { useDb, useSession } from "@/data/store"
import {
  addInstallationPhoto,
  captureSignature,
  completeInstallation,
  pauseJob,
  recordTests,
  removeInstallationPhoto,
  setChecklistItem,
  startJob,
  verifyInstalledSerial,
} from "@/services/operations"
import { useAction } from "@/lib/useAction"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/Button"
import { Callout, EmptyState, StatusBadge } from "@/components/ui/feedback"
import { Panel } from "@/components/ui/data"
import {
  FileUploader,
  FormField,
  SelectInput,
  TextInput,
} from "@/components/ui/forms"
import { useToast } from "@/components/ui/overlays"
import { BarcodeScanPanel } from "@/components/special/BarcodeScanPanel"
import { DocumentPreview } from "@/components/special/DocumentPreview"
import { SignatureCapture } from "@/components/special/SignatureCapture"
import { TechnicianChecklist } from "@/components/special/TechnicianChecklist"

export default function TechnicianPage() {
  const db = useDb()
  const session = useSession()
  const [params, setParams] = useSearchParams()
  const isInstaller = session?.role === "installer"
  const [techId, setTechId] = useState(isInstaller ? session!.userId! : "U-07")
  const jobId = params.get("job")
  const mine = db.installations.filter((i) =>
    i.crew.some((c) => c.technicianId === techId),
  )
  const active = mine
    .filter((i) => i.status !== "Completed")
    .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""))
  const done = mine
    .filter((i) => i.status === "Completed")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .slice(0, 5)
  const job = db.installations.find((i) => i.id === jobId)
  if (job)
    return (
      <JobView instId={job.id} techId={techId} onBack={() => setParams({})} />
    )
  const tech = db.users.find((u) => u.id === techId)
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Technician workspace"
        title={`Jobs for ${tech?.name.split(" ")[0]}`}
        description="Assigned installations. Open a job to start work and capture evidence."
      />
      {!isInstaller && (
        <FormField label="Viewing as technician (admin)" className="mb-5">
          <SelectInput
            value={techId}
            onChange={(e) => setTechId(e.target.value)}
            options={db.users
              .filter((u) => u.role === "installer")
              .map((u) => ({
                value: u.id,
                label: `${u.name} (${db.installations.filter((i) => i.status !== "Completed" && i.crew.some((c) => c.technicianId === u.id)).length} open)`,
              }))}
          />
        </FormField>
      )}
      {active.length === 0 ? (
        <div className="surface">
          <EmptyState
            title="No open jobs"
            description="New assignments appear here as soon as an installation is scheduled with you on the crew."
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {active.map((i) => {
            const c = db.customers.find((x) => x.id === i.customerId)
            const site = db.sites.find((s) => s.id === i.siteId)
            const ev = installationEvidence(db, i)
            return (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => setParams({ job: i.id })}
                  className="glass-light flex w-full items-center gap-4 p-4 text-left transition-transform active:scale-[0.99]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[13px] font-medium">
                        {i.reference}
                      </span>
                      <StatusBadge status={i.status} />
                      {!ev.delivered && (
                        <StatusBadge tone="warning">
                          Material pending
                        </StatusBadge>
                      )}
                    </div>
                    <p className="mt-1 font-medium text-ink">{c?.name}</p>
                    <p className="text-[13px] text-muted">
                      {site?.city} · {i.capacity} kW {i.systemType} ·{" "}
                      {fmtDateTime(i.scheduledAt)}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-forest/8">
                      <div
                        className="h-full rounded-full bg-emerald"
                        style={{ width: `${installationProgress(i)}%` }}
                      />
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {done.length > 0 && (
        <div className="mt-8">
          <p className="mb-2 text-[13px] font-medium text-muted">
            Recently completed
          </p>
          <ul className="surface divide-y divide-forest/7">
            {done.map((i) => (
              <li key={i.id}>
                <Link
                  to={`/app/installations/${i.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-[#F6FAF5]"
                >
                  <span className="font-mono">{i.reference}</span>
                  <span className="text-muted">{fmtDate(i.completedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function JobView({
  instId,
  techId,
  onBack,
}: {
  instId: string
  techId: string
  onBack: () => void
}) {
  const db = useDb()
  const toast = useToast()
  const { run, fire, pending } = useAction()
  const inst = db.installations.find((i) => i.id === instId)!
  const c = db.customers.find((x) => x.id === inst.customerId)!
  const site = db.sites.find((s) => s.id === inst.siteId)!
  const ev = installationEvidence(db, inst)
  const missing = installationMissing(db, inst)
  const working = inst.status === "In Progress"
  const completed = inst.status === "Completed"
  const [tests, setTests] =
    useState<Record<keyof Omit<TestResults, "recordedAt">, string>>(() => ({
      generationKw: String(inst.tests?.generationKw ?? ""),
      dcVoltage: String(inst.tests?.dcVoltage ?? ""),
      acVoltage: String(inst.tests?.acVoltage ?? "230"),
      insulationMOhm: String(inst.tests?.insulationMOhm ?? ""),
      earthingOhm: String(inst.tests?.earthingOhm ?? ""),
    }))
  const [report, setReport] = useState(false)
  const openSheet = inst.timesheets.filter((t) => !t.end)
  const lock = !working && !completed

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-24">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> My jobs
      </button>
      <section className="relative overflow-hidden rounded-[24px] bg-forest p-5 text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(60%_80%_at_100%_0%,rgb(244_197_66/0.25),transparent_60%)]"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm">{inst.reference}</span>
            <StatusBadge status={inst.status} className="bg-white/90" />
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {c.name}
          </h1>
          <p className="text-white/75">
            {inst.capacity} kW {inst.systemType} ·{" "}
            {fmtDateTime(inst.scheduledAt)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
            <a
              href={`tel:+91${c.phone}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 hover:bg-white/20"
            >
              <Phone className="h-3.5 w-3.5" /> {c.phone}
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.address}, ${site.city} ${site.pin}`)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 hover:bg-white/20"
            >
              <MapPin className="h-3.5 w-3.5" /> {site.address || site.city}
            </a>
          </div>
        </div>
      </section>

      {!completed && (
        <div className="glass-light flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-botanical" />
            {openSheet.length ? (
              <>Started {fmtTime(openSheet[0].start)} · timer running</>
            ) : inst.timesheets.length ? (
              <>Last session ended {fmtTime(inst.timesheets.at(-1)?.end)}</>
            ) : (
              "Not started"
            )}
          </div>
          {working ? (
            <Button
              variant="secondary"
              icon={<Pause className="h-4 w-4" />}
              loading={pending === "pause"}
              onClick={() =>
                fire(
                  "pause",
                  () => pauseJob(inst.id, ""),
                  "Job paused — end time recorded",
                )
              }
            >
              Pause job
            </Button>
          ) : (
            <Button
              variant="primary"
              icon={<Play className="h-4 w-4" />}
              disabledReason={
                !ev.delivered && "Material not yet delivered to site"
              }
              loading={pending === "start"}
              onClick={() =>
                fire(
                  "start",
                  () => startJob(inst.id, techId),
                  inst.status === "Paused"
                    ? "Job resumed"
                    : "Job started — start time recorded",
                )
              }
            >
              {inst.status === "Paused" ? "Resume job" : "Start job"}
            </Button>
          )}
        </div>
      )}
      {lock && (
        <Callout tone="info">
          Start the job to update the worksheet. Start and end times are
          recorded automatically.
        </Callout>
      )}
      {completed && (
        <Callout
          tone="success"
          title="Job completed"
          action={
            <Button
              size="sm"
              icon={<FileText className="h-4 w-4" />}
              onClick={() => setReport(true)}
            >
              Handover report
            </Button>
          }
        >
          Customer accepted on {fmtDateTime(inst.completedAt)}. Warranties are
          active.
        </Callout>
      )}

      <Panel
        title="Checklist"
        description={`${installationProgress(inst)}% complete`}
      >
        <TechnicianChecklist
          inst={inst}
          disabled={!working}
          pendingKey={pending}
          onToggle={(k, v) =>
            fire(`chk-${k}`, () => setChecklistItem(inst.id, k, v))
          }
        />
      </Panel>

      <Panel
        title="Photographs"
        description="Minimum two: completed array and inverter/wiring."
      >
        <FileUploader
          photos={inst.photos}
          disabled={!working}
          onAdd={(p) =>
            run(
              "photo",
              () => addInstallationPhoto(inst.id, p),
              "Photo uploaded",
            )
          }
          onRemove={(pid) =>
            fire("photo", () => removeInstallationPhoto(inst.id, pid))
          }
          samplePhotos={SAMPLE_PHOTOS.install.map((url, i) => ({
            url,
            caption: [
              "Array completed",
              "Inverter & wiring",
              "Module close-up",
              "Roof overview",
            ][i],
          }))}
          onError={(m) => toast({ tone: "error", title: m })}
        />
      </Panel>

      <Panel
        title="Equipment serial verification"
        description={`${inst.verifiedSerials.filter((s) => ev.expectedSerials.includes(s)).length} of ${ev.expectedSerials.length} dispatched serials verified on site`}
      >
        {working && (
          <BarcodeScanPanel
            label="Scan installed serial"
            onScan={(s) =>
              run(
                "verify",
                () => verifyInstalledSerial(inst.id, s),
                undefined,
                { silentError: true },
              )
            }
            suggest={() =>
              ev.expectedSerials.find((s) => !inst.verifiedSerials.includes(s))
            }
          />
        )}
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {ev.expectedSerials.map((s) => {
            const ok = inst.verifiedSerials.includes(s)
            const u = db.units.find((x) => x.serial === s)
            return (
              <li
                key={s}
                className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[12.5px] ${
                  ok ? "bg-emerald/10" : "bg-forest/[0.04]"
                }`}
              >
                <span>
                  <span className="font-mono">{s}</span>
                  <span className="block text-[11px] text-muted">
                    {u && productOf(db, u.productId)?.name}
                  </span>
                </span>
                {ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald" />
                ) : (
                  <span className="text-[11px] text-muted">pending</span>
                )}
              </li>
            )
          })}
        </ul>
      </Panel>

      <Panel
        title="Test results"
        description={
          inst.tests
            ? `Recorded ${fmtDateTime(inst.tests.recordedAt)}`
            : "Safety limits: insulation ≥ 1 MΩ, earthing ≤ 5 Ω"
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {([
            ["generationKw", "Generation (kW)"],
            ["dcVoltage", "DC voltage (V)"],
            ["acVoltage", "AC voltage (V)"],
            ["insulationMOhm", "Insulation (MΩ)"],
            ["earthingOhm", "Earthing (Ω)"],
          ] as const).map(([k, label]) => (
            <FormField key={k} label={label} required>
              <TextInput
                inputMode="decimal"
                disabled={!working}
                value={tests[k]}
                onChange={(e) =>
                  setTests({
                    ...tests,
                    [k]: e.target.value.replace(/[^\d.]/g, ""),
                  })
                }
              />
            </FormField>
          ))}
        </div>
        {working && (
          <Button
            size="sm"
            variant="dark"
            className="mt-4"
            loading={pending === "tests"}
            disabled={Object.values(tests).some((v) => !v)}
            onClick={() =>
              fire(
                "tests",
                () =>
                  recordTests(
                    inst.id,
                    Object.fromEntries(
                      Object.entries(tests).map(([k, v]) => [k, Number(v)]),
                    ) as Omit<TestResults, "recordedAt">,
                  ),
                "Test results recorded",
              )
            }
          >
            Save test results
          </Button>
        )}
      </Panel>

      <Panel title="Customer acceptance">
        <SignatureCapture
          defaultName={c.name}
          existing={inst.signature}
          disabled={!working}
          saving={pending === "sign"}
          onSave={(name, url) =>
            fire(
              "sign",
              () => captureSignature(inst.id, name, url),
              "Customer signature captured",
            )
          }
        />
      </Panel>

      {!completed && (
        <div className="sticky bottom-4 z-10">
          <div className="glass glass-modal rounded-[24px] p-4">
            {missing.length > 0 ? (
              <p className="mb-3 text-[13px] text-[#835400]">
                Missing: {missing.join(" · ")}
              </p>
            ) : (
              <p className="mb-3 text-[13px] text-[#17673F]">
                All mandatory items captured.
              </p>
            )}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabledReason={
                !working
                  ? "Start the job first"
                  : missing.length
                    ? `Cannot complete — missing ${missing.length} item(s)`
                    : null
              }
              loading={pending === "complete"}
              onClick={() =>
                fire(
                  "complete",
                  () => completeInstallation(inst.id),
                  "Completion report submitted — warranties activated",
                )
              }
            >
              Submit completion report
            </Button>
          </div>
        </div>
      )}
      <DocumentPreview
        open={report}
        onClose={() => setReport(false)}
        title={`Handover report ${inst.reference}`}
        html={handoverHtml(db, inst)}
        filename={`handover-${inst.reference}.html`}
      />
    </div>
  )
}
