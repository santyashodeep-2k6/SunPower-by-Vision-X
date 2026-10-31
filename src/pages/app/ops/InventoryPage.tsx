import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { AlertTriangle, Boxes, Coins, PackageX } from "lucide-react"
import type { Product } from "@/lib/types"
import { compactInr, fmtDate, fmtDateTime, inr } from "@/lib/format"
import { inventoryValue, productOf, stockOf } from "@/lib/rules"
import { useDb } from "@/data/store"
import { adjustStock } from "@/services/operations"
import { useAction } from "@/lib/useAction"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/Button"
import { Callout, StatusBadge } from "@/components/ui/feedback"
import {
  DataTable,
  KeyValueGrid,
  SearchFilterBar,
  StatCard,
  Tabs,
  type Column,
} from "@/components/ui/data"
import { FormField, TextInput } from "@/components/ui/forms"
import { Drawer } from "@/components/ui/overlays"

export default function InventoryPage() {
  const db = useDb()
  const [params, setParams] = useSearchParams()
  const tab = (params.get("tab") ??
    "catalogue") as "catalogue" | "serials" | "history"
  const [q, setQ] = useState(params.get("q") ?? "")
  const [cat, setCat] = useState("")
  const [onlyLow, setOnlyLow] = useState(false)
  const [unitStatus, setUnitStatus] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const products = useMemo(
    () =>
      db.products
        .map((p) => ({ p, s: stockOf(db, p.id) }))
        .filter(
          ({ p, s }) =>
            (!q ||
              `${p.id} ${p.name}`.toLowerCase().includes(q.toLowerCase())) &&
            (!cat || p.category === cat) &&
            (!onlyLow || s.low),
        ),
    [db, q, cat, onlyLow],
  )
  const units = useMemo(
    () =>
      db.units.filter(
        (u) =>
          (!q ||
            u.serial.toLowerCase().includes(q.toLowerCase()) ||
            productOf(db, u.productId)
              ?.name.toLowerCase()
              .includes(q.toLowerCase())) &&
          (!unitStatus || u.status === unitStatus) &&
          (!cat || productOf(db, u.productId)?.category === cat),
      ),
    [db, q, unitStatus, cat],
  )
  const moves = useMemo(
    () =>
      db.movements.filter(
        (m) =>
          (!q ||
            `${m.reference} ${m.serial ?? ""} ${productOf(db, m.productId)?.name}`
              .toLowerCase()
              .includes(q.toLowerCase())) &&
          (!cat || productOf(db, m.productId)?.category === cat),
      ),
    [db, q, cat],
  )
  type PRow = typeof products[number]
  const status = (s: PRow["s"]) =>
    s.available <= 0 ? "Out of stock" : s.low ? "Low stock" : "In Stock"
  const pCols: Column<PRow>[] = [
    {
      key: "name",
      header: "Product",
      sortValue: (r) => r.p.name,
      render: (r) => (
        <div>
          <p className="font-medium">{r.p.name}</p>
          <p className="font-mono text-[12px] text-muted">
            {r.p.id} · {r.p.category}
            {r.p.serialized ? " · serialized" : ""}
          </p>
        </div>
      ),
    },
    {
      key: "on",
      header: "On hand",
      align: "right",
      sortValue: (r) => r.s.onHand,
      render: (r) => r.s.onHand,
    },
    {
      key: "res",
      header: "Reserved",
      align: "right",
      sortValue: (r) => r.s.reserved,
      render: (r) => r.s.reserved,
    },
    {
      key: "av",
      header: "Available",
      align: "right",
      sortValue: (r) => r.s.available,
      render: (r) => <span className="font-semibold">{r.s.available}</span>,
    },
    {
      key: "dsp",
      header: "Dispatched",
      align: "right",
      sortValue: (r) => r.s.dispatched,
      render: (r) => r.s.dispatched,
    },
    {
      key: "val",
      header: "Stock value",
      align: "right",
      sortValue: (r) => r.s.onHand * r.p.unitCost,
      render: (r) => inr(r.s.onHand * r.p.unitCost),
    },
    {
      key: "st",
      header: "Status",
      render: (r) => <StatusBadge status={status(r.s)} />,
    },
  ]
  const uCols: Column<typeof units[number]>[] = [
    {
      key: "serial",
      header: "Serial",
      sortValue: (u) => u.serial,
      render: (u) => <span className="font-mono text-[13px]">{u.serial}</span>,
    },
    {
      key: "p",
      header: "Product",
      sortValue: (u) => productOf(db, u.productId)?.name ?? "",
      render: (u) => productOf(db, u.productId)?.name,
    },
    {
      key: "st",
      header: "Status",
      sortValue: (u) => u.status,
      render: (u) => <StatusBadge status={u.status} />,
    },
    {
      key: "rec",
      header: "Received",
      sortValue: (u) => u.receivedAt,
      render: (u) => fmtDate(u.receivedAt),
    },
    {
      key: "link",
      header: "Linked to",
      render: (u) => {
        const i = db.installations.find((x) => x.id === u.installationId)
        return i ? (
          <Link
            onClick={(e) => e.stopPropagation()}
            to={`/app/installations/${i.id}`}
            className="font-mono text-[12.5px] text-botanical hover:underline"
          >
            {i.reference}
          </Link>
        ) : u.purchaseOrderId ? (
          <span className="font-mono text-[12.5px] text-muted">
            {u.purchaseOrderId}
          </span>
        ) : (
          "—"
        )
      },
    },
  ]
  const mCols: Column<typeof moves[number]>[] = [
    {
      key: "at",
      header: "Date",
      sortValue: (m) => m.at,
      render: (m) => fmtDateTime(m.at),
    },
    {
      key: "p",
      header: "Product",
      render: (m) => productOf(db, m.productId)?.name,
    },
    {
      key: "type",
      header: "Movement",
      render: (m) => (
        <StatusBadge
          tone={
            m.type === "Received"
              ? "success"
              : m.type === "Dispatched"
                ? "info"
                : m.type === "Reserved"
                  ? "gold"
                  : "neutral"
          }
        >
          {m.type}
        </StatusBadge>
      ),
    },
    {
      key: "qty",
      header: "Qty",
      align: "right",
      render: (m) => (
        <span className={m.qty < 0 ? "text-[#A93A26]" : "text-[#17673F]"}>
          {m.qty > 0 ? `+${m.qty}` : m.qty}
        </span>
      ),
    },
    {
      key: "ref",
      header: "Reference",
      render: (m) => (
        <span className="font-mono text-[12.5px]">
          {m.reference}
          {m.serial ? ` · ${m.serial}` : ""}
        </span>
      ),
    },
  ]
  const setTab = (t: string) => setParams(t === "catalogue" ? {} : { tab: t })
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Inventory"
        description="Product catalogue, serial-level records and stock history. Stock can never go negative."
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Inventory value"
          value={compactInr(inventoryValue(db))}
          icon={<Coins className="h-4 w-4" />}
          accent="emerald"
        />
        <StatCard
          label="Serialized units in stock"
          value={db.units.filter((u) => u.status === "In Stock").length}
          icon={<Boxes className="h-4 w-4" />}
          onClick={() => (setTab("serials"), setUnitStatus("In Stock"))}
        />
        <StatCard
          label="Low-stock alerts"
          value={db.products.filter((p) => stockOf(db, p.id).low).length}
          icon={<AlertTriangle className="h-4 w-4" />}
          accent="amber"
          onClick={() => (setTab("catalogue"), setOnlyLow(true))}
          active={onlyLow}
        />
        <StatCard
          label="Out of stock"
          value={
            db.products.filter((p) => stockOf(db, p.id).available <= 0).length
          }
          icon={<PackageX className="h-4 w-4" />}
          accent="danger"
          onClick={() => (setTab("catalogue"), setOnlyLow(true))}
        />
      </div>
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          {
            id: "catalogue",
            label: "Product catalogue",
            count: db.products.length,
          },
          { id: "serials", label: "Serial numbers", count: db.units.length },
          { id: "history", label: "Stock history", count: db.movements.length },
        ]}
      />
      <div className="surface overflow-hidden">
        <div className="border-b border-forest/7 p-4">
          <SearchFilterBar
            search={q}
            onSearch={setQ}
            placeholder={
              tab === "serials"
                ? "Search serial number or product…"
                : "Search products or references…"
            }
            onReset={() => (
              setQ(""), setCat(""), setOnlyLow(false), setUnitStatus("")
            )}
            filters={[
              {
                id: "cat",
                label: "Category",
                value: cat,
                onChange: setCat,
                options: [...new Set(db.products.map((p) => p.category))].map(
                  (c) => ({ value: c, label: c }),
                ),
              },
              ...(tab === "serials"
                ? [
                    {
                      id: "us",
                      label: "Unit status",
                      value: unitStatus,
                      onChange: setUnitStatus,
                      options: [
                        "In Stock",
                        "Dispatched",
                        "Installed",
                        "Faulty Returned",
                        "Replaced",
                      ].map((s) => ({ value: s, label: s })),
                    },
                  ]
                : []),
            ]}
          >
            {tab === "catalogue" && (
              <label className="inline-flex items-center gap-2 text-[13px] text-ink">
                <input
                  type="checkbox"
                  checked={onlyLow}
                  onChange={(e) => setOnlyLow(e.target.checked)}
                  className="h-4 w-4 accent-[#38B878]"
                />{" "}
                Low stock only
              </label>
            )}
          </SearchFilterBar>
        </div>
        {tab === "catalogue" && (
          <DataTable
            rows={products}
            columns={pCols}
            rowKey={(r) => r.p.id}
            rowLabel={(r) => r.p.name}
            onRowClick={(r) => setSelected(r.p.id)}
            pageSize={15}
          />
        )}
        {tab === "serials" && (
          <DataTable
            rows={units}
            columns={uCols}
            rowKey={(u) => u.serial}
            pageSize={15}
            initialSort={{ key: "rec", dir: "desc" }}
            dense
          />
        )}
        {tab === "history" && (
          <DataTable
            rows={moves}
            columns={mCols}
            rowKey={(m) => m.id}
            pageSize={15}
            initialSort={{ key: "at", dir: "desc" }}
            dense
          />
        )}
      </div>
      <ProductDrawer productId={selected} onClose={() => setSelected(null)} />
    </>
  )
}

function ProductDrawer({
  productId,
  onClose,
}: {
  productId: string | null
  onClose: () => void
}) {
  const db = useDb()
  const { run, pending } = useAction()
  const [delta, setDelta] = useState("")
  const [reason, setReason] = useState("")
  const p: Product | undefined = db.products.find((x) => x.id === productId)
  const s = p ? stockOf(db, p.id) : null
  return (
    <Drawer
      open={!!p}
      onClose={onClose}
      title={p?.name ?? ""}
      description={
        p
          ? `${p.id} · ${p.category} · ${db.suppliers.find((x) => x.id === p.supplierId)?.name}`
          : ""
      }
    >
      {p && s && (
        <div className="space-y-5">
          <KeyValueGrid
            columns={3}
            items={[
              { label: "On hand", value: `${s.onHand} ${p.unit}` },
              { label: "Reserved", value: s.reserved },
              { label: "Available", value: s.available },
              { label: "Dispatched", value: s.dispatched },
              { label: "Reorder level", value: p.reorderLevel },
              {
                label: "Unit cost / price",
                value: `${inr(p.unitCost)} / ${inr(p.unitPrice)}`,
              },
              { label: "Warranty", value: p.warrantyTerms },
            ]}
          />
          {s.low && (
            <Callout tone="warning">
              Available stock is at or below the reorder level. Raise a purchase
              request from Purchase → Stock shortage.
            </Callout>
          )}
          {p.serialized ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">
                Serials in stock (
                {
                  db.units.filter(
                    (u) => u.productId === p.id && u.status === "In Stock",
                  ).length
                }
                )
              </p>
              <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                {db.units
                  .filter(
                    (u) => u.productId === p.id && u.status === "In Stock",
                  )
                  .map((u) => (
                    <span
                      key={u.serial}
                      className="rounded-full bg-forest/5 px-2 py-0.5 font-mono text-[11.5px]"
                    >
                      {u.serial}
                    </span>
                  ))}
              </div>
              <p className="mt-3 text-[12.5px] text-muted">
                Serialized stock changes only through goods receipt, dispatch
                and returns.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-forest/8 p-4">
              <p className="mb-3 text-sm font-semibold text-ink">
                Stock adjustment
              </p>
              <div className="grid grid-cols-[110px_1fr] gap-3">
                <FormField label="Change">
                  <TextInput
                    inputMode="numeric"
                    value={delta}
                    onChange={(e) =>
                      setDelta(e.target.value.replace(/[^\d-]/g, ""))
                    }
                    placeholder="-5 or 10"
                  />
                </FormField>
                <FormField label="Reason">
                  <TextInput
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Cycle count correction"
                  />
                </FormField>
              </div>
              <Button
                size="sm"
                variant="dark"
                className="mt-3"
                disabled={!delta || delta === "-"}
                loading={pending === "adj"}
                onClick={() =>
                  run(
                    "adj",
                    () => adjustStock(p.id, Number(delta), reason),
                    "Stock adjusted",
                  )
                    .then(() => (setDelta(""), setReason("")))
                    .catch(() => undefined)
                }
              >
                Apply adjustment
              </Button>
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">
              Recent movements
            </p>
            <ul className="divide-y divide-forest/7 text-[13px]">
              {db.movements
                .filter((m) => m.productId === p.id)
                .slice(0, 12)
                .map((m) => (
                  <li key={m.id} className="flex justify-between gap-3 py-2">
                    <span>
                      {m.type} ·{" "}
                      <span className="font-mono">{m.reference}</span>
                    </span>
                    <span
                      className={
                        m.qty < 0 ? "text-[#A93A26]" : "text-[#17673F]"
                      }
                    >
                      {m.qty > 0 ? `+${m.qty}` : m.qty}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </Drawer>
  )
}
