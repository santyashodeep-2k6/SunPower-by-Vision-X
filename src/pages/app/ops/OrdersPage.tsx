import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { fmtDate, inr } from "@/lib/format"
import { paidForOrder } from "@/lib/rules"
import { useDb } from "@/data/store"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatusBadge } from "@/components/ui/feedback"
import {
  DataTable,
  SearchFilterBar,
  StatCard,
  type Column,
} from "@/components/ui/data"

export const paymentStatus = (total: number, paid: number) =>
  paid >= total ? "Paid" : paid > 0 ? "Part paid" : "Unpaid"

export default function OrdersPage() {
  const db = useDb()
  const navigate = useNavigate()
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")
  const [pay, setPay] = useState("")
  const rows = useMemo(
    () =>
      db.salesOrders
        .map((so) => {
          const paid = paidForOrder(db, so.id)
          return {
            so,
            paid,
            c: db.customers.find((c) => c.id === so.customerId),
            inst: db.installations.find((i) => i.id === so.installationId),
            q: db.quotations.find((x) => x.id === so.quotationId),
            pay: paymentStatus(so.total, paid),
          }
        })
        .filter(
          (r) =>
            (!q ||
              `${r.so.id} ${r.c?.name} ${r.inst?.reference}`
                .toLowerCase()
                .includes(q.toLowerCase())) &&
            (!status || r.so.status === status) &&
            (!pay || r.pay === pay),
        ),
    [db, q, status, pay],
  )
  type Row = typeof rows[number]
  const outstanding = rows.reduce(
    (s, r) => s + Math.max(0, r.so.total - r.paid),
    0,
  )
  const columns: Column<Row>[] = [
    {
      key: "id",
      header: "Order",
      sortValue: (r) => r.so.id,
      render: (r) => (
        <div>
          <p className="font-mono text-[13px]">{r.so.id}</p>
          <p className="font-mono text-[11.5px] text-muted">
            {r.inst?.reference}
          </p>
        </div>
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
            {r.q?.capacity} kW {r.q?.systemType}
          </p>
        </div>
      ),
    },
    {
      key: "total",
      header: "Order value",
      align: "right",
      sortValue: (r) => r.so.total,
      render: (r) => inr(r.so.total),
    },
    {
      key: "paid",
      header: "Collected",
      align: "right",
      sortValue: (r) => r.paid,
      render: (r) => inr(r.paid),
    },
    {
      key: "out",
      header: "Outstanding",
      align: "right",
      sortValue: (r) => r.so.total - r.paid,
      render: (r) => (
        <span
          className={
            r.so.total - r.paid > 0
              ? "font-medium text-[#835400]"
              : "text-muted"
          }
        >
          {inr(Math.max(0, r.so.total - r.paid))}
        </span>
      ),
    },
    {
      key: "pay",
      header: "Payment",
      render: (r) => <StatusBadge status={r.pay} />,
    },
    {
      key: "status",
      header: "Order status",
      sortValue: (r) => r.so.status,
      render: (r) => <StatusBadge status={r.so.status} />,
    },
    {
      key: "date",
      header: "Created",
      sortValue: (r) => r.so.createdAt,
      render: (r) => fmtDate(r.so.createdAt),
    },
  ]
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Sales orders"
        description="Payments, stock readiness and links to dispatch and installation."
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Orders" value={db.salesOrders.length} />
        <StatCard
          label="Need stock check"
          value={db.salesOrders.filter((s) => s.status === "Confirmed").length}
          accent="gold"
          onClick={() => setStatus("Confirmed")}
          active={status === "Confirmed"}
        />
        <StatCard
          label="Awaiting stock"
          value={
            db.salesOrders.filter((s) => s.status === "Awaiting Stock").length
          }
          accent="amber"
          onClick={() => setStatus("Awaiting Stock")}
          active={status === "Awaiting Stock"}
        />
        <StatCard
          label="Outstanding (filtered)"
          value={inr(outstanding)}
          accent="danger"
          onClick={() => setPay(pay ? "" : "Part paid")}
        />
      </div>
      <div className="surface overflow-hidden">
        <div className="border-b border-forest/7 p-4">
          <SearchFilterBar
            search={q}
            onSearch={setQ}
            placeholder="Search order, customer, SOL reference…"
            onReset={() => (setQ(""), setStatus(""), setPay(""))}
            filters={[
              {
                id: "st",
                label: "Status",
                value: status,
                onChange: setStatus,
                options: [
                  "Confirmed",
                  "Awaiting Stock",
                  "Stock Reserved",
                  "Dispatched",
                  "Delivered",
                  "Installed",
                  "Closed",
                ].map((s) => ({ value: s, label: s })),
              },
              {
                id: "pay",
                label: "Payment",
                value: pay,
                onChange: setPay,
                options: ["Paid", "Part paid", "Unpaid"].map((s) => ({
                  value: s,
                  label: s,
                })),
              },
            ]}
          />
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.so.id}
          rowLabel={(r) => `order ${r.so.id}`}
          onRowClick={(r) => navigate(`/app/orders/${r.so.id}`)}
          initialSort={{ key: "date", dir: "desc" }}
        />
      </div>
    </>
  )
}
