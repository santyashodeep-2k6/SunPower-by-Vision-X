import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import {
  FileText,
  PackageSearch,
  Plus,
  ShoppingCart,
  Truck,
} from "lucide-react"
import type { Payment } from "@/lib/types"
import { fmtDate, inr } from "@/lib/format"
import { invoiceHtml } from "@/lib/documents"
import { orderStockCheck, paidForOrder, productOf } from "@/lib/rules"
import { useDb } from "@/data/store"
import {
  checkAndReserveStock,
  createDispatch,
  raiseShortagePurchase,
  recordPayment,
} from "@/services/operations"
import { useAction } from "@/lib/useAction"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button, ButtonLink } from "@/components/ui/Button"
import { Callout, EmptyState, StatusBadge } from "@/components/ui/feedback"
import { Panel } from "@/components/ui/data"
import { FormField, SelectInput, TextInput } from "@/components/ui/forms"
import { Modal } from "@/components/ui/overlays"
import { DocumentPreview } from "@/components/special/DocumentPreview"
import { InstallationProgressTracker } from "@/components/special/InstallationProgressTracker"
import { paymentStatus } from "./OrdersPage"

export default function OrderDetailPage() {
  const { id } = useParams()
  const db = useDb()
  const navigate = useNavigate()
  const { run, pending } = useAction()
  const [modal, setModal] = useState<null | "pay" | "dispatch" | "invoice">(
    null,
  )
  const [pay, setPay] = useState({
    amount: "",
    method: "UPI" as Payment["method"],
    reference: "",
    kind: "Balance" as Payment["kind"],
  })
  const [veh, setVeh] = useState({
    vehicle: "MH12 QW 4471",
    driver: "Balu Kshirsagar",
  })
  const so = db.salesOrders.find((s) => s.id === id)
  if (!so)
    return (
      <EmptyState
        title="Order not found"
        action={
          <ButtonLink to="/app/orders" variant="dark" size="sm">
            Back
          </ButtonLink>
        }
      />
    )
  const c = db.customers.find((x) => x.id === so.customerId)!
  const inst = db.installations.find((i) => i.id === so.installationId)
  const quote = db.quotations.find((q) => q.id === so.quotationId)
  const paid = paidForOrder(db, so.id)
  const outstanding = Math.max(0, so.total - paid)
  const payments = db.payments.filter((p) => p.salesOrderId === so.id)
  const check = orderStockCheck(db, so.id)
  const shortages = check.filter((l) => l.shortage > 0)
  const dispatch = db.dispatches.find((d) => d.salesOrderId === so.id)
  const pos = db.purchaseOrders.filter((p) => p.salesOrderId === so.id)
  const canCheck = ["Confirmed", "Awaiting Stock"].includes(so.status)

  return (
    <>
      <PageHeader
        back={{ to: "/app/orders", label: "All orders" }}
        eyebrow={`${so.id} · ${inst?.reference} · quotation ${so.quotationId}`}
        title={`${c.name} — ${quote?.capacity} kW ${quote?.systemType}`}
        badges={
          <>
            <StatusBadge status={so.status} />
            <StatusBadge status={paymentStatus(so.total, paid)} />
          </>
        }
        actions={
          <>
            <Button
              size="sm"
              icon={<FileText className="h-4 w-4" />}
              onClick={() => setModal("invoice")}
            >
              Invoice
            </Button>
            <Button
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              disabledReason={outstanding <= 0 && "Order is fully paid"}
              onClick={() => (
                setPay({
                  amount: String(outstanding),
                  method: "UPI",
                  reference: "",
                  kind: "Balance",
                }),
                setModal("pay")
              )}
            >
              Record payment
            </Button>
            <Button
              size="sm"
              variant="dark"
              icon={<PackageSearch className="h-4 w-4" />}
              disabledReason={
                !canCheck &&
                `Stock already ${
                  so.status === "Stock Reserved" ? "reserved" : "issued"
                }`
              }
              loading={pending === "check"}
              onClick={() =>
                run(
                  "check",
                  () => checkAndReserveStock(so.id),
                  (r) =>
                    r.reserved
                      ? "All BOM items reserved"
                      : `${r.shortages.length} item(s) short — raise a purchase request`,
                ).catch(() => undefined)
              }
            >
              Check & reserve stock
            </Button>
            {dispatch ? (
              <ButtonLink
                size="sm"
                variant="primary"
                to={`/app/dispatches/${dispatch.id}`}
              >
                Open {dispatch.id}
              </ButtonLink>
            ) : (
              <Button
                size="sm"
                variant="primary"
                icon={<Truck className="h-4 w-4" />}
                disabledReason={
                  so.status !== "Stock Reserved" &&
                  (shortages.length
                    ? "Required material is missing — see shortages"
                    : "Reserve stock before dispatch")
                }
                onClick={() => setModal("dispatch")}
              >
                Open delivery
              </Button>
            )}
          </>
        }
      />
      {so.status === "Awaiting Stock" && (
        <Callout
          tone="warning"
          title="Dispatch blocked — required material is missing"
          className="mb-5"
          action={
            <Button
              size="sm"
              variant="dark"
              icon={<ShoppingCart className="h-4 w-4" />}
              loading={pending === "pr"}
              onClick={() =>
                run(
                  "pr",
                  () => raiseShortagePurchase(so.id),
                  (ids) => `Purchase request ${ids.join(", ")} raised`,
                ).catch(() => undefined)
              }
            >
              Raise purchase request
            </Button>
          }
        >
          {shortages
            .map(
              (s) =>
                `${productOf(db, s.productId)?.name}: short by ${s.shortage}`,
            )
            .join(" · ") || "Re-run the stock check — stock may have arrived."}
        </Callout>
      )}
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel
          title="Bill of materials & stock"
          className="xl:col-span-2"
          bodyClass="p-0"
        >
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-forest/8 bg-[#F8FBF7] text-left text-[12px] tracking-wide text-muted uppercase">
                  <th className="px-5 py-2.5 font-medium">Item</th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Required
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Available
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Reserved for order
                  </th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {check.map((l) => {
                  const p = productOf(db, l.productId)!
                  const issued = [
                    "Dispatched",
                    "Delivered",
                    "Installed",
                    "Closed",
                  ].includes(so.status)
                  return (
                    <tr
                      key={l.productId}
                      className="border-b border-forest/6 last:border-0"
                    >
                      <td className="px-5 py-2.5">
                        {p.name}
                        <p className="text-[12px] text-muted">
                          {p.id}
                          {p.serialized ? " · serialized" : ""}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {l.qty} {p.unit}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {l.available}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {l.reservedForOrder}
                      </td>
                      <td className="px-5 py-2.5">
                        {issued ? (
                          <StatusBadge status="Dispatched" />
                        ) : l.reservedForOrder >= l.qty ? (
                          <StatusBadge status="Stock Reserved">
                            Reserved
                          </StatusBadge>
                        ) : l.shortage > 0 ? (
                          <StatusBadge tone="danger">
                            Short {l.shortage}
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="success">Available</StatusBadge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        <div className="space-y-5">
          <Panel title="Payments">
            <dl className="mb-4 grid grid-cols-3 gap-2 text-center">
              {[
                ["Invoiced", so.total],
                ["Collected", paid],
                ["Outstanding", outstanding],
              ].map(([k, v]) => (
                <div
                  key={k as string}
                  className="rounded-xl bg-forest/[0.04] p-2"
                >
                  <dt className="text-[11px] text-muted uppercase">{k}</dt>
                  <dd
                    className={`text-sm font-semibold tabular-nums ${
                      k === "Outstanding" && v as number > 0
                        ? "text-[#835400]"
                        : "text-ink"
                    }`}
                  >
                    {inr(v as number)}
                  </dd>
                </div>
              ))}
            </dl>
            <ul className="divide-y divide-forest/7 text-sm">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <span>
                    <span className="font-medium">{p.kind}</span>{" "}
                    <span className="text-[12px] text-muted">
                      · {p.method} · {p.reference}
                    </span>
                    <span className="block text-[12px] text-muted">
                      {fmtDate(p.at)}
                    </span>
                  </span>
                  <span className="tabular-nums">{inr(p.amount)}</span>
                </li>
              ))}
            </ul>
          </Panel>
          {pos.length > 0 && (
            <Panel title="Linked purchases">
              <ul className="space-y-2 text-sm">
                {pos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <Link
                      to="/app/purchases"
                      className="font-mono text-botanical hover:underline"
                    >
                      {p.id}
                    </Link>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
        {inst && (
          <Panel
            title="Installation progress"
            className="xl:col-span-3"
            actions={
              <ButtonLink size="sm" to={`/app/installations/${inst.id}`}>
                View installation
              </ButtonLink>
            }
          >
            <InstallationProgressTracker db={db} inst={inst} />
          </Panel>
        )}
      </div>

      <DocumentPreview
        open={modal === "invoice"}
        onClose={() => setModal(null)}
        title={`Invoice for ${so.id}`}
        html={invoiceHtml(db, so)}
        filename={`invoice-${so.id}.html`}
      />
      <Modal
        open={modal === "pay"}
        onClose={() => setModal(null)}
        title="Record payment"
        description={`Outstanding ${inr(outstanding)}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={pending === "pay"}
              onClick={() =>
                run(
                  "pay",
                  () =>
                    recordPayment(so.id, {
                      ...pay,
                      amount: Number(pay.amount),
                    }),
                  "Payment recorded",
                )
                  .then(() => setModal(null))
                  .catch(() => undefined)
              }
            >
              Save payment
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Amount" required>
            <TextInput
              prefix="₹"
              inputMode="numeric"
              value={pay.amount}
              onChange={(e) =>
                setPay({ ...pay, amount: e.target.value.replace(/\D/g, "") })
              }
            />
          </FormField>
          <FormField label="Type" required>
            <SelectInput
              value={pay.kind}
              onChange={(e) =>
                setPay({ ...pay, kind: e.target.value as Payment["kind"] })
              }
              options={["Advance", "Balance"]}
            />
          </FormField>
          <FormField label="Method" required>
            <SelectInput
              value={pay.method}
              onChange={(e) =>
                setPay({ ...pay, method: e.target.value as Payment["method"] })
              }
              options={["UPI", "Bank Transfer", "Cheque", "Cash", "Card"]}
            />
          </FormField>
          <FormField label="Reference" required>
            <TextInput
              value={pay.reference}
              onChange={(e) => setPay({ ...pay, reference: e.target.value })}
            />
          </FormField>
        </div>
      </Modal>
      <Modal
        open={modal === "dispatch"}
        onClose={() => setModal(null)}
        size="sm"
        title="Open delivery"
        footer={
          <Button
            variant="primary"
            loading={pending === "dsp"}
            onClick={() =>
              run(
                "dsp",
                () => createDispatch(so.id, veh.vehicle, veh.driver),
                (d) => `Delivery ${d} opened`,
              )
                .then((d) => navigate(`/app/dispatches/${d}`))
                .catch(() => undefined)
            }
          >
            Open delivery
          </Button>
        }
      >
        <div className="space-y-4">
          <FormField label="Vehicle number" required>
            <TextInput
              value={veh.vehicle}
              onChange={(e) => setVeh({ ...veh, vehicle: e.target.value })}
            />
          </FormField>
          <FormField label="Driver" required>
            <TextInput
              value={veh.driver}
              onChange={(e) => setVeh({ ...veh, driver: e.target.value })}
            />
          </FormField>
        </div>
      </Modal>
    </>
  )
}
