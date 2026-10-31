import { useMemo, useState } from "react"
import { Link } from "react-router"
import { PackageCheck, Plus, ShoppingCart, Trash2 } from "lucide-react"
import type { PurchaseOrder } from "@/lib/types"
import { fmtDate, inr } from "@/lib/format"
import { orderStockCheck, productOf, stockOf } from "@/lib/rules"
import { useDb } from "@/data/store"
import {
  cancelPurchase,
  createPurchaseRequest,
  markPurchaseOrdered,
  raiseShortagePurchase,
  receivePurchase,
} from "@/services/operations"
import { useAction } from "@/lib/useAction"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/Button"
import { Callout, EmptyState, StatusBadge } from "@/components/ui/feedback"
import {
  DataTable,
  Panel,
  StatCard,
  Tabs,
  type Column,
} from "@/components/ui/data"
import { FormField, SelectInput, TextInput } from "@/components/ui/forms"
import { Drawer, Modal } from "@/components/ui/overlays"

export default function PurchasesPage() {
  const db = useDb()
  const { run, fire, pending } = useAction()
  const [tab, setTab] = useState<"orders" | "shortages" | "suppliers">("orders")
  const [openPo, setOpenPo] = useState<string | null>(null)
  const [creating, setCreating] = useState<null | {
    supplierId: string
    lines: { productId: string; qty: string }[]
    reason: string
  }>(null)
  const [receipt, setReceipt] = useState<Record<string, string>>({})
  const po = db.purchaseOrders.find((p) => p.id === openPo)
  const shortOrders = db.salesOrders
    .filter((s) => s.status === "Awaiting Stock")
    .map((so) => ({
      so,
      lines: orderStockCheck(db, so.id).filter((l) => l.shortage > 0),
    }))
  const low = db.products.filter((p) => stockOf(db, p.id).low)
  const pendingReceipts = db.purchaseOrders.filter((p) =>
    ["Ordered", "Partially Received"].includes(p.status),
  )
  const columns: Column<PurchaseOrder>[] = [
    {
      key: "id",
      header: "PO",
      sortValue: (p) => p.id,
      render: (p) => <span className="font-mono text-[13px]">{p.id}</span>,
    },
    {
      key: "sup",
      header: "Supplier",
      render: (p) => db.suppliers.find((s) => s.id === p.supplierId)?.name,
    },
    {
      key: "items",
      header: "Products",
      render: (p) =>
        p.lines
          .map((l) => `${productOf(db, l.productId)?.name} ×${l.qty}`)
          .join(", "),
    },
    {
      key: "rec",
      header: "Received",
      render: (p) =>
        `${p.lines.reduce((s, l) => s + l.received, 0)} / ${p.lines.reduce((s, l) => s + l.qty, 0)}`,
    },
    {
      key: "value",
      header: "Value",
      align: "right",
      sortValue: (p) => p.lines.reduce((s, l) => s + l.qty * l.unitCost, 0),
      render: (p) => inr(p.lines.reduce((s, l) => s + l.qty * l.unitCost, 0)),
    },
    {
      key: "date",
      header: "Created",
      sortValue: (p) => p.createdAt,
      render: (p) => fmtDate(p.createdAt),
    },
    {
      key: "st",
      header: "Status",
      render: (p) => <StatusBadge status={p.status} />,
    },
  ]
  const newRequest = (
    supplierId = "SUP-03",
    lines = [{ productId: "", qty: "" }],
    reason = "",
  ) => setCreating({ supplierId, lines, reason })
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Purchase management"
        description="Suppliers, purchase requests, purchase orders and goods receipt."
        actions={
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => newRequest()}
          >
            New purchase request
          </Button>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Open requests"
          value={
            db.purchaseOrders.filter((p) => p.status === "Requested").length
          }
          accent="gold"
        />
        <StatCard
          label="Pending receipts"
          value={pendingReceipts.length}
          accent="amber"
        />
        <StatCard
          label="Orders short of stock"
          value={shortOrders.length}
          accent="danger"
          onClick={() => setTab("shortages")}
        />
        <StatCard
          label="Low-stock products"
          value={low.length}
          accent="amber"
          onClick={() => setTab("shortages")}
        />
      </div>
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          {
            id: "orders",
            label: "Purchase orders",
            count: db.purchaseOrders.length,
          },
          {
            id: "shortages",
            label: "Stock shortage",
            count: shortOrders.length + low.length,
          },
          { id: "suppliers", label: "Suppliers", count: db.suppliers.length },
        ]}
      />
      {tab === "orders" && (
        <div className="surface overflow-hidden">
          <DataTable
            rows={db.purchaseOrders}
            columns={columns}
            rowKey={(p) => p.id}
            rowLabel={(p) => `purchase order ${p.id}`}
            onRowClick={(p) => (setReceipt({}), setOpenPo(p.id))}
            initialSort={{ key: "date", dir: "desc" }}
          />
        </div>
      )}
      {tab === "shortages" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Sales orders blocked by shortage">
            {shortOrders.length === 0 ? (
              <EmptyState compact title="No blocked orders" />
            ) : (
              <ul className="space-y-3">
                {shortOrders.map(({ so, lines }) => (
                  <li
                    key={so.id}
                    className="rounded-2xl border border-forest/8 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        to={`/app/orders/${so.id}`}
                        className="font-mono text-sm font-medium text-botanical hover:underline"
                      >
                        {so.id}
                      </Link>
                      <Button
                        size="sm"
                        variant="dark"
                        icon={<ShoppingCart className="h-4 w-4" />}
                        loading={pending === so.id}
                        onClick={() =>
                          fire(
                            so.id,
                            () => raiseShortagePurchase(so.id),
                            (ids) => `Raised ${ids.join(", ")}`,
                          )
                        }
                      >
                        Raise request
                      </Button>
                    </div>
                    <p className="mt-1 text-[13px] text-muted">
                      {db.customers.find((c) => c.id === so.customerId)?.name}
                    </p>
                    <ul className="mt-2 text-[13px]">
                      {lines.map((l) => (
                        <li key={l.productId}>
                          {productOf(db, l.productId)?.name} — short{" "}
                          <span className="font-semibold text-[#A93A26]">
                            {l.shortage}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Below reorder level">
            {low.length === 0 ? (
              <EmptyState compact title="All products above reorder level" />
            ) : (
              <ul className="divide-y divide-forest/7">
                {low.map((p) => {
                  const s = stockOf(db, p.id)
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm"
                    >
                      <span>
                        {p.name}
                        <span className="block text-[12px] text-muted">
                          available {s.available} · reorder at {p.reorderLevel}
                        </span>
                      </span>
                      <Button
                        size="sm"
                        onClick={() =>
                          newRequest(
                            p.supplierId,
                            [
                              {
                                productId: p.id,
                                qty: String(
                                  Math.max(p.reorderLevel * 2 - s.available, 1),
                                ),
                              },
                            ],
                            `Replenish ${p.name}`,
                          )
                        }
                      >
                        Request
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}
      {tab === "suppliers" && (
        <div className="grid gap-4 md:grid-cols-2">
          {db.suppliers.map((s) => (
            <div key={s.id} className="surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{s.name}</p>
                  <p className="text-[13px] text-muted">
                    {s.city} · {s.contact} · {s.phone}
                  </p>
                </div>
                <span className="font-mono text-[12px] text-muted">{s.id}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.categories.map((c) => (
                  <StatusBadge key={c} tone="neutral">
                    {c}
                  </StatusBadge>
                ))}
              </div>
              <p className="mt-3 text-[13px] text-muted">
                Lead time {s.leadTimeDays} days ·{" "}
                {db.purchaseOrders.filter((p) => p.supplierId === s.id).length}{" "}
                purchase orders
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => newRequest(s.id)}
              >
                New request
              </Button>
            </div>
          ))}
        </div>
      )}

      <Drawer
        open={!!po}
        onClose={() => setOpenPo(null)}
        title={po ? `Purchase order ${po.id}` : ""}
        description={
          po
            ? `${db.suppliers.find((s) => s.id === po.supplierId)?.name} · ${po.reason}`
            : ""
        }
        footer={
          po && (
            <>
              {po.status === "Requested" && (
                <Button
                  variant="danger"
                  loading={pending === "cancel"}
                  onClick={() =>
                    fire(
                      "cancel",
                      () => cancelPurchase(po.id),
                      "Purchase cancelled",
                    )
                  }
                >
                  Cancel
                </Button>
              )}
              {po.status === "Requested" && (
                <Button
                  variant="dark"
                  loading={pending === "order"}
                  onClick={() =>
                    fire(
                      "order",
                      () => markPurchaseOrdered(po.id),
                      "Order placed with supplier",
                    )
                  }
                >
                  Place order
                </Button>
              )}
              {["Ordered", "Partially Received"].includes(po.status) && (
                <Button
                  variant="primary"
                  icon={<PackageCheck className="h-4 w-4" />}
                  loading={pending === "recv"}
                  onClick={() =>
                    run(
                      "recv",
                      () =>
                        receivePurchase(
                          po.id,
                          Object.fromEntries(
                            Object.entries(receipt).map(([k, v]) => [
                              k,
                              Number(v) || 0,
                            ]),
                          ),
                        ),
                      (s) =>
                        `Goods received${
                          s.length ? ` — ${s.length} serials registered` : ""
                        }`,
                    )
                      .then(() => setReceipt({}))
                      .catch(() => undefined)
                  }
                >
                  Receive goods
                </Button>
              )}
            </>
          )
        }
      >
        {po && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={po.status} />
              {po.expectedAt && (
                <StatusBadge tone="neutral">
                  Expected {fmtDate(po.expectedAt)}
                </StatusBadge>
              )}
              {po.salesOrderId && (
                <Link
                  to={`/app/orders/${po.salesOrderId}`}
                  className="text-[13px] font-medium text-botanical underline"
                >
                  {po.salesOrderId}
                </Link>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[12px] text-muted uppercase">
                  <th className="py-2 font-medium">Product</th>
                  <th className="py-2 text-right font-medium">Ordered</th>
                  <th className="py-2 text-right font-medium">Received</th>
                  <th className="py-2 text-right font-medium">Receive now</th>
                </tr>
              </thead>
              <tbody>
                {po.lines.map((l) => (
                  <tr key={l.productId} className="border-t border-forest/7">
                    <td className="py-2.5">
                      {productOf(db, l.productId)?.name}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{l.qty}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      {l.received}
                    </td>
                    <td className="py-2.5 text-right">
                      {["Ordered", "Partially Received"].includes(po.status) &&
                      l.received < l.qty ? (
                        <input
                          aria-label={`Receive quantity for ${productOf(db, l.productId)?.name}`}
                          inputMode="numeric"
                          placeholder={String(l.qty - l.received)}
                          value={receipt[l.productId] ?? ""}
                          onChange={(e) =>
                            setReceipt({
                              ...receipt,
                              [l.productId]: e.target.value.replace(/\D/g, ""),
                            })
                          }
                          className="field h-8 w-20 text-right"
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {po.status === "Requested" && (
              <Callout tone="info">
                Place the order with the supplier before receiving goods.
              </Callout>
            )}
            {po.lines.some((l) => productOf(db, l.productId)?.serialized) &&
              ["Ordered", "Partially Received"].includes(po.status) && (
                <Callout tone="info">
                  Serialized items get demo serial numbers on receipt. In
                  production they are scanned at goods receipt.
                </Callout>
              )}
          </div>
        )}
      </Drawer>

      <Modal
        open={!!creating}
        onClose={() => setCreating(null)}
        size="lg"
        title="New purchase request"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={pending === "create"}
              onClick={() =>
                creating &&
                run(
                  "create",
                  () =>
                    createPurchaseRequest({
                      supplierId: creating.supplierId,
                      reason: creating.reason,
                      lines: creating.lines
                        .filter((l) => l.productId)
                        .map((l) => ({
                          productId: l.productId,
                          qty: Number(l.qty) || 0,
                        })),
                    }),
                  (id) => `Purchase request ${id} created`,
                )
                  .then(() => setCreating(null))
                  .catch(() => undefined)
              }
            >
              Create request
            </Button>
          </>
        }
      >
        {creating && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Supplier" required>
                <SelectInput
                  value={creating.supplierId}
                  onChange={(e) =>
                    setCreating({
                      ...creating,
                      supplierId: e.target.value,
                      lines: [{ productId: "", qty: "" }],
                    })
                  }
                  options={db.suppliers.map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))}
                />
              </FormField>
              <FormField label="Reason" required>
                <TextInput
                  value={creating.reason}
                  onChange={(e) =>
                    setCreating({ ...creating, reason: e.target.value })
                  }
                  placeholder="e.g. Monthly replenishment"
                />
              </FormField>
            </div>
            {creating.lines.map((l, i) => (
              <div key={i} className="flex items-end gap-2">
                <FormField label={i === 0 ? "Product" : ""} className="flex-1">
                  <SelectInput
                    value={l.productId}
                    onChange={(e) =>
                      setCreating({
                        ...creating,
                        lines: creating.lines.map((x, j) =>
                          j === i ? { ...x, productId: e.target.value } : x,
                        ),
                      })
                    }
                    placeholder="Select product…"
                    options={db.products
                      .filter((p) =>
                        db.suppliers
                          .find((s) => s.id === creating.supplierId)
                          ?.categories.includes(p.category),
                      )
                      .map((p) => ({
                        value: p.id,
                        label: `${p.name} (available ${stockOf(db, p.id).available})`,
                      }))}
                  />
                </FormField>
                <FormField label={i === 0 ? "Qty" : ""}>
                  <TextInput
                    inputMode="numeric"
                    className="w-24"
                    value={l.qty}
                    onChange={(e) =>
                      setCreating({
                        ...creating,
                        lines: creating.lines.map((x, j) =>
                          j === i
                            ? { ...x, qty: e.target.value.replace(/\D/g, "") }
                            : x,
                        ),
                      })
                    }
                  />
                </FormField>
                <button
                  type="button"
                  aria-label="Remove line"
                  onClick={() =>
                    setCreating({
                      ...creating,
                      lines: creating.lines.filter((_, j) => j !== i),
                    })
                  }
                  className="mb-1 rounded-full p-2 text-muted hover:bg-forest/6"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() =>
                setCreating({
                  ...creating,
                  lines: [...creating.lines, { productId: "", qty: "" }],
                })
              }
            >
              Add product
            </Button>
          </div>
        )}
      </Modal>
    </>
  )
}
