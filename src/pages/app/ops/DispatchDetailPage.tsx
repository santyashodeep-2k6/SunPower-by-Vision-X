import { useState } from "react"
import { Link, useParams } from "react-router"
import { CheckCircle2, PackageCheck, Truck, Wand2 } from "lucide-react"
import { fmtDateTime } from "@/lib/format"
import { productOf } from "@/lib/rules"
import { getDb, useDb } from "@/data/store"
import {
  allocateSerial,
  autoAllocate,
  confirmDelivery,
  confirmDispatch,
  removeSerial,
} from "@/services/operations"
import { useAction } from "@/lib/useAction"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button, ButtonLink } from "@/components/ui/Button"
import { Callout, EmptyState, StatusBadge } from "@/components/ui/feedback"
import { Panel } from "@/components/ui/data"
import { FormField, TextInput } from "@/components/ui/forms"
import { Modal } from "@/components/ui/overlays"
import { BarcodeScanPanel } from "@/components/special/BarcodeScanPanel"
import { SerialNumberSelector } from "@/components/special/SerialNumberSelector"

export default function DispatchDetailPage() {
  const { id } = useParams()
  const db = useDb()
  const { run, fire, pending } = useAction()
  const [deliverOpen, setDeliverOpen] = useState(false)
  const d = db.dispatches.find((x) => x.id === id)
  const so = d && db.salesOrders.find((s) => s.id === d.salesOrderId)
  const c = so && db.customers.find((x) => x.id === so.customerId)
  const [receivedBy, setReceivedBy] = useState(c?.name ?? "")
  if (!d || !so)
    return (
      <EmptyState
        title="Delivery not found"
        action={
          <ButtonLink to="/app/dispatches" variant="dark" size="sm">
            Back
          </ButtonLink>
        }
      />
    )
  const inst = db.installations.find((i) => i.id === d.installationId)
  const draft = d.status === "Draft"
  const taken = new Set(
    db.dispatches
      .filter((x) => x.status === "Draft")
      .flatMap((x) => x.lines.flatMap((l) => l.serials)),
  )
  const freeSerials = (pid: string) =>
    db.units
      .filter(
        (u) =>
          u.productId === pid &&
          u.status === "In Stock" &&
          !taken.has(u.serial),
      )
      .map((u) => u.serial)
  const problems = d.lines.flatMap((l) => {
    const p = productOf(db, l.productId)!
    if (p.serialized && l.serials.length !== l.qty)
      return [`${p.name}: ${l.serials.length}/${l.qty} serials allocated`]
    if (!p.serialized && p.onHand < l.qty && draft)
      return [`${p.name}: only ${p.onHand} ${p.unit} on hand`]
    return []
  })
  const serialized = d.lines.filter(
    (l) => productOf(db, l.productId)?.serialized,
  )
  const bulk = d.lines.filter((l) => !productOf(db, l.productId)?.serialized)

  return (
    <>
      <PageHeader
        back={{ to: "/app/dispatches", label: "Dispatch" }}
        eyebrow={`${d.id} · order ${so.id} · ${inst?.reference}`}
        title={`Delivery to ${c?.name}`}
        badges={<StatusBadge status={d.status} />}
        description={`${d.vehicle} · ${d.driver}${
          d.dispatchedAt ? ` · dispatched ${fmtDateTime(d.dispatchedAt)}` : ""
        }${
          d.deliveredAt
            ? ` · delivered ${fmtDateTime(d.deliveredAt)} to ${d.receivedBy}`
            : ""
        }`}
        actions={
          <>
            {draft && (
              <Button
                variant="primary"
                icon={<Truck className="h-4 w-4" />}
                disabledReason={
                  problems.length > 0 &&
                  `Cannot dispatch: ${problems.join("; ")}`
                }
                loading={pending === "confirm"}
                onClick={() =>
                  fire(
                    "confirm",
                    () => confirmDispatch(d.id),
                    "Dispatch validated and confirmed",
                  )
                }
              >
                Confirm dispatch
              </Button>
            )}
            {d.status === "Dispatched" && (
              <Button
                variant="primary"
                icon={<PackageCheck className="h-4 w-4" />}
                onClick={() => setDeliverOpen(true)}
              >
                Confirm delivery
              </Button>
            )}
            {inst && (
              <ButtonLink to={`/app/installations/${inst.id}`}>
                Installation
              </ButtonLink>
            )}
          </>
        }
      />
      {draft && problems.length > 0 && (
        <Callout tone="warning" title="Dispatch validation" className="mb-5">
          {problems.join(" · ")}
        </Callout>
      )}
      {draft && problems.length === 0 && (
        <Callout tone="success" title="All serials validated" className="mb-5">
          Every serialized unit is allocated and bulk material is on hand. Ready
          to dispatch.
        </Callout>
      )}
      {d.status === "Delivered" && (
        <Callout tone="success" title="Delivered" className="mb-5">
          Installation can now start.{" "}
          <Link
            className="underline"
            to={`/app/installations/${d.installationId}`}
          >
            Schedule or open the job
          </Link>
          .
        </Callout>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {serialized.map((l) => {
          const p = productOf(db, l.productId)!
          const remaining = l.qty - l.serials.length
          return (
            <Panel
              key={l.productId}
              title={p.name}
              description={`${l.qty} units · serial prefix ${p.serialPrefix}`}
              actions={
                draft &&
                remaining > 0 && (
                  <Button
                    size="sm"
                    icon={<Wand2 className="h-4 w-4" />}
                    loading={pending === `auto-${p.id}`}
                    onClick={() =>
                      fire(
                        `auto-${p.id}`,
                        () => autoAllocate(d.id, p.id),
                        (n) => `${n} serial(s) allocated (simulated scan)`,
                      )
                    }
                  >
                    Auto-allocate {remaining}
                  </Button>
                )
              }
            >
              <SerialNumberSelector
                allocated={l.serials}
                required={l.qty}
                available={freeSerials(p.id)}
                disabled={!draft}
                onAdd={(s) =>
                  fire("alloc", () => allocateSerial(d.id, p.id, s))
                }
                onRemove={(s) => fire("rm", () => removeSerial(d.id, p.id, s))}
              />
              {draft && remaining > 0 && (
                <div className="mt-3">
                  <BarcodeScanPanel
                    compact={l.qty > 2}
                    label={`Scan ${p.category.toLowerCase()} serial`}
                    onScan={(s) =>
                      run(
                        "scan",
                        () => allocateSerial(d.id, p.id, s),
                        undefined,
                        { silentError: true },
                      ).then(() => p.name)
                    }
                    suggest={() => {
                      const db2 = getDb()
                      const t = new Set(
                        db2.dispatches
                          .filter((x) => x.status === "Draft")
                          .flatMap((x) => x.lines.flatMap((y) => y.serials)),
                      )
                      return db2.units.find(
                        (u) =>
                          u.productId === p.id &&
                          u.status === "In Stock" &&
                          !t.has(u.serial),
                      )?.serial
                    }}
                  />
                </div>
              )}
            </Panel>
          )
        })}
        <Panel
          title="Bulk material"
          description="Issued by quantity."
          className="lg:col-span-2"
          bodyClass="p-0"
        >
          <ul className="divide-y divide-forest/7 text-sm">
            {bulk.map((l) => {
              const p = productOf(db, l.productId)!
              const ok = !draft || p.onHand >= l.qty
              return (
                <li
                  key={l.productId}
                  className="flex items-center justify-between gap-3 px-5 py-2.5"
                >
                  <span>{p.name}</span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums">
                      {l.qty} {p.unit}
                    </span>
                    {draft && (
                      <span className="text-[12px] text-muted">
                        on hand {p.onHand}
                      </span>
                    )}
                    {ok ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald" />
                    ) : (
                      <StatusBadge tone="danger">Short</StatusBadge>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>
      <Modal
        open={deliverOpen}
        onClose={() => setDeliverOpen(false)}
        size="sm"
        title="Confirm delivery at site"
        footer={
          <Button
            variant="primary"
            loading={pending === "deliver"}
            onClick={() =>
              run(
                "deliver",
                () => confirmDelivery(d.id, receivedBy),
                "Delivery confirmed",
              )
                .then(() => setDeliverOpen(false))
                .catch(() => undefined)
            }
          >
            Confirm delivery
          </Button>
        }
      >
        <FormField label="Received by" required>
          <TextInput
            value={receivedBy}
            onChange={(e) => setReceivedBy(e.target.value)}
          />
        </FormField>
      </Modal>
    </>
  )
}
