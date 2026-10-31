import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Truck } from "lucide-react"
import { fmtDate, fmtDateTime } from "@/lib/format"
import { useDb } from "@/data/store"
import { createDispatch } from "@/services/operations"
import { useAction } from "@/lib/useAction"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/Button"
import { EmptyState, StatusBadge } from "@/components/ui/feedback"
import { DataTable, Panel, Tabs, type Column } from "@/components/ui/data"

export default function DispatchesPage() {
  const db = useDb()
  const navigate = useNavigate()
  const { run, pending } = useAction()
  const [tab, setTab] = useState<"open" | "history">("open")
  const ready = db.salesOrders.filter(
    (s) =>
      s.status === "Stock Reserved" &&
      !db.dispatches.some((d) => d.salesOrderId === s.id),
  )
  const rows = useMemo(
    () =>
      db.dispatches
        .filter((d) =>
          tab === "open" ? d.status !== "Delivered" : d.status === "Delivered",
        )
        .map((d) => ({
          d,
          c: db.customers.find(
            (c) =>
              c.id ===
              db.salesOrders.find((s) => s.id === d.salesOrderId)?.customerId,
          ),
          inst: db.installations.find((i) => i.id === d.installationId),
        })),
    [db, tab],
  )
  type Row = typeof rows[number]
  const columns: Column<Row>[] = [
    {
      key: "id",
      header: "Delivery",
      sortValue: (r) => r.d.id,
      render: (r) => <span className="font-mono text-[13px]">{r.d.id}</span>,
    },
    {
      key: "c",
      header: "Customer",
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
      key: "serials",
      header: "Serials",
      render: (r) =>
        `${r.d.lines.reduce((s, l) => s + l.serials.length, 0)} / ${r.d.lines.filter((l) => db.products.find((p) => p.id === l.productId)?.serialized).reduce((s, l) => s + l.qty, 0)}`,
    },
    {
      key: "veh",
      header: "Vehicle",
      render: (r) => `${r.d.vehicle} · ${r.d.driver}`,
    },
    {
      key: "when",
      header: tab === "open" ? "Opened" : "Delivered",
      sortValue: (r) => r.d.deliveredAt ?? r.d.createdAt,
      render: (r) => fmtDateTime(r.d.deliveredAt ?? r.d.createdAt),
    },
    {
      key: "st",
      header: "Status",
      render: (r) => <StatusBadge status={r.d.status} />,
    },
  ]
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Dispatch"
        description="Allocate and validate serial numbers, then confirm dispatch and delivery."
      />
      {ready.length > 0 && (
        <Panel
          title="Ready to dispatch"
          description="Orders with all materials reserved."
          className="mb-5"
          bodyClass="p-0"
        >
          <ul className="divide-y divide-forest/7">
            {ready.map((so) => (
              <li
                key={so.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <span>
                  <span className="font-mono">{so.id}</span> ·{" "}
                  {db.customers.find((c) => c.id === so.customerId)?.name} ·
                  reserved {fmtDate(so.createdAt)}
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Truck className="h-4 w-4" />}
                  loading={pending === so.id}
                  onClick={() =>
                    run(
                      so.id,
                      () =>
                        createDispatch(
                          so.id,
                          "MH12 QW 4471",
                          "Balu Kshirsagar",
                        ),
                      (d) => `Delivery ${d} opened`,
                    )
                      .then((d) => navigate(`/app/dispatches/${d}`))
                      .catch(() => undefined)
                  }
                >
                  Open delivery
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          {
            id: "open",
            label: "Open deliveries",
            count: db.dispatches.filter((d) => d.status !== "Delivered").length,
          },
          {
            id: "history",
            label: "Dispatch history",
            count: db.dispatches.filter((d) => d.status === "Delivered").length,
          },
        ]}
      />
      <div className="surface overflow-hidden">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.d.id}
          rowLabel={(r) => `delivery ${r.d.id}`}
          onRowClick={(r) => navigate(`/app/dispatches/${r.d.id}`)}
          initialSort={{ key: "when", dir: "desc" }}
          empty={
            <EmptyState
              compact
              icon={<Truck className="h-5 w-5" />}
              title={tab === "open" ? "No open deliveries" : "No history yet"}
              description={
                tab === "open"
                  ? "Reserve stock on an order, then open a delivery."
                  : undefined
              }
            />
          }
        />
      </div>
    </>
  )
}
