import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { ShieldAlert, ShieldCheck, ShieldX, Timer } from "lucide-react"
import type { Warranty } from "@/lib/types"
import { fmtDate } from "@/lib/format"
import { productName, warrantyState } from "@/lib/rules"
import { useDb } from "@/data/store"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatusBadge } from "@/components/ui/feedback"
import {
  DataTable,
  SearchFilterBar,
  StatCard,
  Tabs,
  type Column,
} from "@/components/ui/data"
import { Drawer } from "@/components/ui/overlays"
import { WarrantyCard } from "@/components/special/WarrantyCard"
import { useWarrantyCheck } from "@/components/special/useWarrantyCheck"

type View = "Active" | "Expiring Soon" | "Expired" | "claims" | "all"

export default function WarrantiesPage() {
  const db = useDb()
  const [params, setParams] = useSearchParams()
  const view = (params.get("view") ?? "all") as View
  const [q, setQ] = useState(params.get("q") ?? "")
  const [selected, setSelected] = useState<string | null>(null)
  const claimIds = new Set(
    db.serviceTickets
      .filter((t) => t.status !== "Closed" && t.warrantyId)
      .map((t) => t.warrantyId),
  )
  const rows = useMemo(
    () =>
      db.warranties
        .filter((w) => !w.supersededBy || view === "all")
        .map((w) => ({
          w,
          st: warrantyState(w),
          c: db.customers.find((c) => c.id === w.customerId),
          inst: db.installations.find((i) => i.id === w.installationId),
        }))
        .filter(
          ({ w, st, c, inst }) =>
            (view === "all" ||
              (view === "claims" ? claimIds.has(w.id) : st === view)) &&
            (!q ||
              `${w.serial} ${c?.name} ${c?.phone} ${inst?.reference}`
                .toLowerCase()
                .includes(q.toLowerCase())),
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, view, q],
  )
  type Row = typeof rows[number]
  const columns: Column<Row>[] = [
    {
      key: "p",
      header: "Product",
      sortValue: (r) => productName(db, r.w.productId),
      render: (r) => productName(db, r.w.productId),
    },
    {
      key: "serial",
      header: "Serial",
      sortValue: (r) => r.w.serial,
      render: (r) => (
        <span className="font-mono text-[12.5px]">{r.w.serial}</span>
      ),
    },
    {
      key: "c",
      header: "Customer",
      sortValue: (r) => r.c?.name ?? "",
      render: (r) => r.c?.name,
    },
    {
      key: "inst",
      header: "Installation",
      render: (r) => (
        <Link
          to={`/app/installations/${r.inst?.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-mono text-[12.5px] text-botanical hover:underline"
        >
          {r.inst?.reference}
        </Link>
      ),
    },
    {
      key: "end",
      header: "Expiry",
      sortValue: (r) => r.w.end,
      render: (r) => fmtDate(r.w.end),
    },
    {
      key: "st",
      header: "Status",
      render: (r) => (
        <span className="flex gap-1">
          <StatusBadge status={r.st} />
          {claimIds.has(r.w.id) && <StatusBadge tone="gold">Claim</StatusBadge>}
        </span>
      ),
    },
  ]
  const count = (s: string) =>
    db.warranties.filter((w) => warrantyState(w) === s).length
  const sel = db.warranties.find((w) => w.id === selected)
  const setView = (v: string) => setParams(v === "all" ? {} : { view: v })
  return (
    <>
      <PageHeader
        eyebrow="After-sales"
        title="Warranties"
        description="Component-level warranty records retained through replacements."
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Active"
          value={count("Active")}
          icon={<ShieldCheck className="h-4 w-4" />}
          accent="emerald"
          onClick={() => setView("Active")}
          active={view === "Active"}
        />
        <StatCard
          label="Expiring within 90 days"
          value={count("Expiring Soon")}
          icon={<Timer className="h-4 w-4" />}
          accent="amber"
          onClick={() => setView("Expiring Soon")}
          active={view === "Expiring Soon"}
        />
        <StatCard
          label="Expired"
          value={count("Expired")}
          icon={<ShieldX className="h-4 w-4" />}
          accent="danger"
          onClick={() => setView("Expired")}
          active={view === "Expired"}
        />
        <StatCard
          label="Claims under review"
          value={claimIds.size}
          icon={<ShieldAlert className="h-4 w-4" />}
          accent="gold"
          onClick={() => setView("claims")}
          active={view === "claims"}
        />
      </div>
      <Tabs
        className="mb-4"
        value={view}
        onChange={setView}
        tabs={[
          { id: "all", label: "All records" },
          { id: "Active", label: "Active" },
          { id: "Expiring Soon", label: "Expiring soon" },
          { id: "Expired", label: "Expired" },
          { id: "claims", label: "Claims under review" },
        ]}
      />
      <div className="surface overflow-hidden">
        <div className="border-b border-forest/7 p-4">
          <SearchFilterBar
            search={q}
            onSearch={setQ}
            placeholder="Search customer, phone, serial number or SOL reference…"
          />
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.w.id}
          rowLabel={(r) => `warranty ${r.w.serial}`}
          onRowClick={(r) => setSelected(r.w.id)}
          pageSize={15}
          initialSort={{ key: "end", dir: "asc" }}
        />
      </div>
      <WarrantyDrawer w={sel} onClose={() => setSelected(null)} />
    </>
  )
}

function WarrantyDrawer({ w, onClose }: { w?: Warranty; onClose: () => void }) {
  const db = useDb()
  const { result } = useWarrantyCheck(w?.serial)
  const repl = w
    ? db.replacements.filter(
        (r) =>
          r.originalSerial === w.serial || r.replacementSerial === w.serial,
      )
    : []
  const tickets = w
    ? db.serviceTickets.filter(
        (t) => t.serial === w.serial || t.warrantyId === w.id,
      )
    : []
  const inst = w && db.installations.find((i) => i.id === w.installationId)
  return (
    <Drawer
      open={!!w}
      onClose={onClose}
      title="Warranty details"
      description={w ? `${w.id} · ${productName(db, w.productId)}` : ""}
    >
      {w && (
        <div className="space-y-5">
          {w.supersededBy ? (
            <p className="rounded-2xl bg-forest/[0.04] p-4 text-sm">
              This unit was replaced. Its warranty continues on record{" "}
              {w.supersededBy}.
            </p>
          ) : result ? (
            <WarrantyCard v={result} />
          ) : null}
          {inst && (
            <Link
              to={`/app/passport/${inst.reference}`}
              className="block text-[13px] font-medium text-botanical hover:underline"
            >
              Open asset passport {inst.reference}
            </Link>
          )}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">
              Replacement history
            </p>
            {repl.length === 0 ? (
              <p className="text-[13px] text-muted">No replacements.</p>
            ) : (
              repl.map((r) => (
                <p key={r.id} className="font-mono text-[12.5px]">
                  <span className="line-through text-muted">
                    {r.originalSerial}
                  </span>{" "}
                  → {r.replacementSerial}{" "}
                  <span className="text-muted">
                    ({fmtDate(r.at)}, {r.serviceTicketId})
                  </span>
                </p>
              ))
            )}
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">
              Service tickets
            </p>
            {tickets.length === 0 ? (
              <p className="text-[13px] text-muted">None.</p>
            ) : (
              tickets.map((t) => (
                <Link
                  key={t.id}
                  to={`/app/service-tickets/${t.id}`}
                  className="flex items-center justify-between py-1 text-sm hover:text-botanical"
                >
                  <span className="font-mono">{t.id}</span>
                  <StatusBadge status={t.status} />
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </Drawer>
  )
}
