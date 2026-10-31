import { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { AlertTriangle, QrCode } from "lucide-react"
import type { InstallationStatus } from "@/lib/types"
import { fmtDate } from "@/lib/format"
import { installationProgress, isDelayed } from "@/lib/rules"
import { getDb, useDb } from "@/data/store"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/Button"
import { StatusBadge } from "@/components/ui/feedback"
import {
  DataTable,
  SearchFilterBar,
  Tabs,
  type Column,
} from "@/components/ui/data"
import { Modal } from "@/components/ui/overlays"
import { BarcodeScanPanel } from "@/components/special/BarcodeScanPanel"

const STATUSES: InstallationStatus[] = [
  "Awaiting Materials",
  "Ready to Schedule",
  "Scheduled",
  "In Progress",
  "Paused",
  "Completed",
]

export default function InstallationsPage() {
  const db = useDb()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [status, setStatus] = useState<"" | InstallationStatus | "delayed">(
    params.get("status") as InstallationStatus ?? "",
  )
  const [q, setQ] = useState("")
  const [tech, setTech] = useState("")
  const [scan, setScan] = useState(false)
  const rows = useMemo(
    () =>
      db.installations
        .map((i) => ({
          i,
          c: db.customers.find((c) => c.id === i.customerId),
          site: db.sites.find((s) => s.id === i.siteId),
          lead: db.users.find(
            (u) => u.id === i.crew.find((x) => x.role === "Lead")?.technicianId,
          ),
        }))
        .filter(
          ({ i, c }) =>
            (!status ||
              (status === "delayed" ? isDelayed(i) : i.status === status)) &&
            (!tech || i.crew.some((x) => x.technicianId === tech)) &&
            (!q ||
              `${i.reference} ${c?.name}`
                .toLowerCase()
                .includes(q.toLowerCase())),
        ),
    [db, status, q, tech],
  )
  type Row = typeof rows[number]
  const columns: Column<Row>[] = [
    {
      key: "ref",
      header: "Reference",
      sortValue: (r) => r.i.reference,
      render: (r) => (
        <span className="font-mono text-[13px]">{r.i.reference}</span>
      ),
    },
    {
      key: "c",
      header: "Customer",
      sortValue: (r) => r.c?.name ?? "",
      render: (r) => (
        <div>
          <p>{r.c?.name}</p>
          <p className="text-[12px] text-muted">
            {r.site?.city} · {r.i.capacity} kW {r.i.systemType}
          </p>
        </div>
      ),
    },
    {
      key: "crew",
      header: "Crew",
      render: (r) =>
        r.lead ? (
          `${r.lead.name}${
            r.i.crew.length > 1 ? ` +${r.i.crew.length - 1}` : ""
          }`
        ) : (
          <span className="text-muted">Not allocated</span>
        ),
    },
    {
      key: "sched",
      header: "Scheduled",
      sortValue: (r) => r.i.scheduledAt ?? "",
      render: (r) => fmtDate(r.i.scheduledAt),
    },
    {
      key: "exp",
      header: "Expected completion",
      sortValue: (r) => r.i.expectedCompletion ?? "",
      render: (r) => (
        <span className="flex items-center gap-1.5">
          {fmtDate(r.i.expectedCompletion)}
          {isDelayed(r.i) && (
            <StatusBadge status="Delayed">
              <AlertTriangle className="h-3 w-3" /> Delayed
            </StatusBadge>
          )}
        </span>
      ),
    },
    {
      key: "prog",
      header: "Checklist",
      sortValue: (r) => installationProgress(r.i),
      render: (r) => (
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-forest/8">
            <span
              className="block h-full bg-emerald"
              style={{ width: `${installationProgress(r.i)}%` }}
            />
          </span>
          <span className="text-[12px] text-muted tabular-nums">
            {installationProgress(r.i)}%
          </span>
        </span>
      ),
    },
    {
      key: "st",
      header: "Status",
      sortValue: (r) => STATUSES.indexOf(r.i.status),
      render: (r) => <StatusBadge status={r.i.status} />,
    },
  ]
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Installations"
        description="Scheduling, crews, progress, evidence and handover for every SOL reference."
        actions={
          <Button
            icon={<QrCode className="h-4 w-4" />}
            onClick={() => setScan(true)}
          >
            Scan asset QR
          </Button>
        }
      />
      <Tabs
        className="mb-4"
        value={status}
        onChange={setStatus}
        tabs={[
          { id: "", label: "All", count: db.installations.length },
          ...STATUSES.map((s) => ({
            id: s,
            label: s,
            count: db.installations.filter((i) => i.status === s).length,
          })),
          {
            id: "delayed",
            label: "Delayed",
            count: db.installations.filter(isDelayed).length,
          },
        ]}
      />
      <div className="surface overflow-hidden">
        <div className="border-b border-forest/7 p-4">
          <SearchFilterBar
            search={q}
            onSearch={setQ}
            placeholder="Search reference or customer…"
            onReset={() => (setQ(""), setTech(""))}
            filters={[
              {
                id: "tech",
                label: "Technician",
                value: tech,
                onChange: setTech,
                options: db.users
                  .filter((u) => u.role === "installer")
                  .map((u) => ({ value: u.id, label: u.name })),
              },
            ]}
          />
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.i.id}
          rowLabel={(r) => r.i.reference}
          onRowClick={(r) => navigate(`/app/installations/${r.i.id}`)}
          initialSort={{ key: "sched", dir: "desc" }}
        />
      </div>
      <Modal
        open={scan}
        onClose={() => setScan(false)}
        size="sm"
        title="Scan Solar Asset Passport"
        description="Point a scanner at the QR label, or type the SOL reference."
      >
        <BarcodeScanPanel
          label="SOL reference"
          onScan={(ref) => {
            const inst = getDb().installations.find(
              (i) =>
                i.reference.toUpperCase() ===
                ref.replace(/.*\/passport\//i, "").toUpperCase(),
            )
            if (!inst) throw new Error(`No installation found for ${ref}.`)
            setScan(false)
            navigate(`/app/passport/${inst.reference}`)
          }}
          suggest={() =>
            getDb().installations.find((i) => i.status === "Completed")
              ?.reference
          }
        />
      </Modal>
    </>
  )
}
