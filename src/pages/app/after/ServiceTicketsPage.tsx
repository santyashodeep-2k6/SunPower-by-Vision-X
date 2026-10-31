import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Plus } from "lucide-react"
import type { TicketStatus } from "@/lib/types"
import { relative } from "@/lib/format"
import { productOf } from "@/lib/rules"
import { useDb, useSession } from "@/data/store"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/Button"
import { StatusBadge } from "@/components/ui/feedback"
import {
  DataTable,
  SearchFilterBar,
  Tabs,
  type Column,
} from "@/components/ui/data"
import { CreateTicketModal } from "@/components/special/CreateTicketModal"

const STATUSES: TicketStatus[] = [
  "Open",
  "Assigned",
  "Diagnosed",
  "Awaiting Approval",
  "In Repair",
  "Awaiting Confirmation",
  "Closed",
]

export default function ServiceTicketsPage() {
  const db = useDb()
  const session = useSession()
  const navigate = useNavigate()
  const [status, setStatus] = useState<"" | "open" | TicketStatus>("open")
  const [q, setQ] = useState("")
  const [mine, setMine] = useState(session?.role === "service")
  const [priority, setPriority] = useState("")
  const [creating, setCreating] = useState(false)
  const rows = useMemo(
    () =>
      db.serviceTickets
        .map((t) => ({
          t,
          c: db.customers.find((c) => c.id === t.customerId),
          inst: db.installations.find((i) => i.id === t.installationId),
        }))
        .filter(
          ({ t, c, inst }) =>
            (!status ||
              (status === "open"
                ? t.status !== "Closed"
                : t.status === status)) &&
            (!mine || !t.assignedTo || t.assignedTo === session?.userId) &&
            (!priority || t.priority === priority) &&
            (!q ||
              `${t.id} ${c?.name} ${t.serial ?? ""} ${inst?.reference} ${t.issue}`
                .toLowerCase()
                .includes(q.toLowerCase())),
        ),
    [db, status, q, mine, priority, session],
  )
  type Row = typeof rows[number]
  const columns: Column<Row>[] = [
    {
      key: "id",
      header: "Ticket",
      sortValue: (r) => r.t.id,
      render: (r) => <span className="font-mono text-[13px]">{r.t.id}</span>,
    },
    {
      key: "c",
      header: "Customer",
      sortValue: (r) => r.c?.name ?? "",
      render: (r) => (
        <div>
          <p>{r.c?.name}</p>
          <p className="font-mono text-[12px] text-muted">
            {r.inst?.reference}
          </p>
        </div>
      ),
    },
    {
      key: "issue",
      header: "Issue",
      render: (r) => (
        <div className="max-w-xs">
          <p className="truncate">{r.t.issue}</p>
          <p className="text-[12px] text-muted">
            {r.t.serial
              ? `${productOf(db, db.units.find((u) => u.serial === r.t.serial)?.productId ?? "")?.name ?? ""} · ${r.t.serial}`
              : "General"}
          </p>
        </div>
      ),
    },
    {
      key: "pr",
      header: "Priority",
      sortValue: (r) =>
        ["Low", "Medium", "High", "Critical"].indexOf(r.t.priority),
      render: (r) => <StatusBadge status={r.t.priority} />,
    },
    {
      key: "cov",
      header: "Coverage",
      render: (r) =>
        r.t.coverage ? (
          <StatusBadge status={r.t.coverage} />
        ) : (
          <span className="text-[12px] text-muted">Not assessed</span>
        ),
    },
    {
      key: "who",
      header: "Technician",
      render: (r) =>
        db.users.find((u) => u.id === r.t.assignedTo)?.name ?? (
          <span className="text-muted italic">Unassigned</span>
        ),
    },
    {
      key: "age",
      header: "Raised",
      sortValue: (r) => r.t.createdAt,
      render: (r) => relative(r.t.createdAt),
    },
    {
      key: "st",
      header: "Status",
      sortValue: (r) => STATUSES.indexOf(r.t.status),
      render: (r) => <StatusBadge status={r.t.status} />,
    },
  ]
  return (
    <>
      <PageHeader
        eyebrow="After-sales"
        title="Service tickets"
        description="Diagnosis, warranty coverage, approvals, repairs and customer confirmation."
        actions={
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setCreating(true)}
          >
            Create ticket
          </Button>
        }
      />
      <Tabs
        className="mb-4"
        value={status}
        onChange={setStatus}
        tabs={[
          {
            id: "open",
            label: "Open",
            count: db.serviceTickets.filter((t) => t.status !== "Closed")
              .length,
          },
          ...STATUSES.map((s) => ({
            id: s,
            label: s,
            count: db.serviceTickets.filter((t) => t.status === s).length,
          })),
          { id: "", label: "All" },
        ]}
      />
      <div className="surface overflow-hidden">
        <div className="border-b border-forest/7 p-4">
          <SearchFilterBar
            search={q}
            onSearch={setQ}
            placeholder="Search ticket, customer, serial, SOL reference…"
            filters={[
              {
                id: "p",
                label: "Priority",
                value: priority,
                onChange: setPriority,
                options: ["Low", "Medium", "High", "Critical"].map((s) => ({
                  value: s,
                  label: s,
                })),
              },
            ]}
          >
            <label className="inline-flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#38B878]"
                checked={mine}
                onChange={(e) => setMine(e.target.checked)}
              />{" "}
              Mine + unassigned
            </label>
          </SearchFilterBar>
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.t.id}
          rowLabel={(r) => `ticket ${r.t.id}`}
          onRowClick={(r) => navigate(`/app/service-tickets/${r.t.id}`)}
          initialSort={{ key: "age", dir: "desc" }}
        />
      </div>
      <CreateTicketModal
        open={creating}
        onClose={() => setCreating(false)}
        raisedBy="staff"
        onCreated={(id) => navigate(`/app/service-tickets/${id}`)}
      />
    </>
  )
}
