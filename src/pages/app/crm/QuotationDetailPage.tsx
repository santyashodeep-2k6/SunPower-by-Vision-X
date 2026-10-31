import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { CheckCircle2, Eye, Receipt, Save, Send, XCircle } from "lucide-react"
import type { Payment } from "@/lib/types"
import { CATEGORY_ORDER, PACKAGES, computeTotals } from "@/lib/catalog"
import { fmtDate, inr } from "@/lib/format"
import { quotationHtml } from "@/lib/documents"
import { useDb } from "@/data/store"
import {
  acceptQuotation,
  convertToSalesOrder,
  effectiveQuoteStatus,
  rejectQuotation,
  sendQuotation,
  updateQuotationDraft,
} from "@/services/crm"
import { useAction } from "@/lib/useAction"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button, ButtonLink } from "@/components/ui/Button"
import {
  Callout,
  DemoBadge,
  EmptyState,
  StatusBadge,
} from "@/components/ui/feedback"
import { Panel } from "@/components/ui/data"
import { FormField, SelectInput, TextInput } from "@/components/ui/forms"
import { ConfirmationDialog, Modal } from "@/components/ui/overlays"
import { DocumentPreview } from "@/components/special/DocumentPreview"

export default function QuotationDetailPage() {
  const { id } = useParams()
  const db = useDb()
  const navigate = useNavigate()
  const { run, fire, pending } = useAction()
  const quote = db.quotations.find((q) => q.id === id)
  const [qty, setQty] = useState<Record<string, string>>({})
  const [modal, setModal] =
    useState<null | "preview" | "reject" | "accept" | "convert">(null)
  const [pay, setPay] = useState<{
    amount: string
    method: Payment["method"]
    reference: string
  }>({ amount: "", method: "UPI", reference: "" })
  useEffect(() => setQty({}), [quote?.packageId, quote?.status])
  const items = useMemo(
    () =>
      quote
        ? quote.items.map((i) => ({
            ...i,
            qty: qty[i.id] !== undefined ? Number(qty[i.id]) || 0 : i.qty,
          }))
        : [],
    [quote, qty],
  )
  if (!quote)
    return (
      <EmptyState
        title="Quotation not found"
        action={
          <ButtonLink to="/app/quotations" variant="dark" size="sm">
            Back
          </ButtonLink>
        }
      />
    )
  const status = effectiveQuoteStatus(quote)
  const draft = quote.status === "Draft"
  const dirty = Object.keys(qty).length > 0
  const totals = dirty
    ? computeTotals(items, quote.labour, quote.otherCharges, db.settings)
    : quote.totals
  const c = db.customers.find((x) => x.id === quote.customerId)!
  const survey = db.surveys.find((s) => s.id === quote.surveyId)
  const sorted = [...items].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
  )
  const saveDraft = () =>
    fire(
      "save",
      () =>
        updateQuotationDraft(quote.id, {
          qty: Object.fromEntries(
            Object.entries(qty).map(([k, v]) => [k, Number(v)]),
          ),
        }),
      "Draft saved",
    )

  return (
    <>
      <PageHeader
        back={{ to: "/app/quotations", label: "All quotations" }}
        eyebrow={`${quote.id} · survey ${quote.surveyId} · lead ${quote.leadId}`}
        title={`${quote.capacity} kW ${quote.systemType} — ${c.name}`}
        badges={
          <>
            <StatusBadge status={status} />
            {quote.amountSource === "demo" && (
              <DemoBadge label="Sample calculation" />
            )}
          </>
        }
        description={`Valid until ${fmtDate(quote.validUntil)}${
          quote.sentAt ? ` · sent ${fmtDate(quote.sentAt)}` : ""
        }`}
        actions={
          <>
            <Button
              size="sm"
              icon={<Eye className="h-4 w-4" />}
              onClick={() => setModal("preview")}
            >
              Preview
            </Button>
            {draft && (
              <Button
                size="sm"
                icon={<Save className="h-4 w-4" />}
                disabled={!dirty}
                loading={pending === "save"}
                onClick={saveDraft}
              >
                Save draft
              </Button>
            )}
            {draft && (
              <Button
                size="sm"
                variant="dark"
                icon={<Send className="h-4 w-4" />}
                disabledReason={dirty && "Save the draft before sending"}
                loading={pending === "send"}
                onClick={() =>
                  fire(
                    "send",
                    () => sendQuotation(quote.id),
                    "Quotation sent to customer",
                  )
                }
              >
                Send
              </Button>
            )}
            {(status === "Sent" || status === "Awaiting Response") && (
              <>
                <Button
                  size="sm"
                  variant="danger"
                  icon={<XCircle className="h-4 w-4" />}
                  onClick={() => setModal("reject")}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={() => setModal("accept")}
                >
                  Accept
                </Button>
              </>
            )}
            {status === "Accepted" && !quote.salesOrderId && (
              <Button
                size="sm"
                variant="primary"
                icon={<Receipt className="h-4 w-4" />}
                onClick={() => (
                  setPay({
                    amount: String(quote.totals.advance),
                    method: "UPI",
                    reference: "",
                  }),
                  setModal("convert")
                )}
              >
                Convert to sales order
              </Button>
            )}
            {quote.salesOrderId && (
              <ButtonLink
                size="sm"
                variant="dark"
                to={`/app/orders/${quote.salesOrderId}`}
              >
                Open {quote.salesOrderId}
              </ButtonLink>
            )}
          </>
        }
      />
      {status === "Expired" && (
        <Callout tone="danger" title="Quotation expired" className="mb-5">
          It can no longer be accepted. Create a revised quotation from the
          approved survey.
        </Callout>
      )}
      {quote.status === "Rejected" && (
        <Callout tone="danger" title="Rejected" className="mb-5">
          {quote.rejectionReason}
        </Callout>
      )}
      {survey?.status !== "Approved" && (
        <Callout tone="warning" className="mb-5">
          Linked survey is {survey?.status.toLowerCase()} — sending is blocked.
        </Callout>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel
          title="Bill of materials"
          description={
            draft
              ? "Configured from the selected package. Adjust quantities if the survey requires it."
              : "Locked after sending."
          }
          className="xl:col-span-2"
          bodyClass="p-0"
          actions={
            draft && (
              <label className="flex items-center gap-2 text-[13px] text-muted">
                Package
                <select
                  value={quote.packageId}
                  onChange={(e) =>
                    fire(
                      "pkg",
                      () =>
                        updateQuotationDraft(quote.id, {
                          packageId: e.target.value,
                        }),
                      "Package changed — BOM regenerated",
                    )
                  }
                  className="field h-9 w-auto text-[13px]"
                >
                  {PACKAGES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            )
          }
        >
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-forest/8 bg-[#F8FBF7] text-left text-[12px] tracking-wide text-muted uppercase">
                  <th className="px-5 py-2.5 font-medium">Item</th>
                  <th className="px-3 py-2.5 text-right font-medium">Qty</th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Unit price
                  </th>
                  <th className="px-5 py-2.5 text-right font-medium">
                    Line total
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((i) => (
                  <tr key={i.id} className="border-b border-forest/6">
                    <td className="px-5 py-2.5">
                      <p className="text-ink">{i.description}</p>
                      <p className="text-[12px] text-muted">
                        {i.category} · {i.productId}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {draft ? (
                        <input
                          aria-label={`Quantity for ${i.description}`}
                          inputMode="numeric"
                          value={qty[i.id] ?? String(i.qty)}
                          onChange={(e) =>
                            setQty({
                              ...qty,
                              [i.id]: e.target.value.replace(/\D/g, ""),
                            })
                          }
                          className="field h-8 w-20 text-right tabular-nums"
                        />
                      ) : (
                        <span className="tabular-nums">{i.qty}</span>
                      )}
                      <span className="ml-1 text-[12px] text-muted">
                        {i.unit}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {inr(i.unitPrice)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium tabular-nums">
                      {inr(i.qty * i.unitPrice)}
                    </td>
                  </tr>
                ))}
                <tr className="border-b border-forest/6">
                  <td className="px-5 py-2.5">
                    Installation service
                    <p className="text-[12px] text-muted">
                      Service · {inr(db.settings.labourPerKw)}/kW
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {quote.capacity} kW
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {inr(quote.labour / quote.capacity)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-medium tabular-nums">
                    {inr(quote.labour)}
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-2.5">
                    Transport
                    {quote.systemType === "On-Grid"
                      ? ", net-metering & documentation"
                      : ""}
                    <p className="text-[12px] text-muted">Other charges</p>
                  </td>
                  <td className="px-3 py-2.5 text-right">1</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {inr(quote.otherCharges)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-medium tabular-nums">
                    {inr(quote.otherCharges)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel
          title="Totals"
          description={
            quote.amountSource === "demo"
              ? "Sample tax rates — official amounts come from the finance backend."
              : "Amounts supplied by the backend."
          }
        >
          <dl className="space-y-2 text-sm">
            {[
              ["Equipment cost", totals.equipment],
              ["Labour cost", totals.labour],
              ["Other charges", totals.other],
              [
                `GST on equipment (${db.settings.equipmentTaxPct}%)`,
                totals.equipmentTax,
              ],
              [
                `GST on services (${db.settings.serviceTaxPct}%)`,
                totals.serviceTax,
              ],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between gap-3">
                <dt className="text-muted">{k}</dt>
                <dd className="tabular-nums">{inr(v as number)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-3 border-t border-forest/10 pt-3 text-base font-semibold">
              <dt>Final amount</dt>
              <dd className="tabular-nums">{inr(totals.total)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">
                Advance ({db.settings.advancePct}%)
              </dt>
              <dd className="tabular-nums">{inr(totals.advance)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Balance</dt>
              <dd className="tabular-nums">{inr(totals.balance)}</dd>
            </div>
            <div className="flex justify-between gap-3 pt-2">
              <dt className="text-muted">Validity</dt>
              <dd>{fmtDate(quote.validUntil)}</dd>
            </div>
          </dl>
          {dirty && (
            <Callout tone="warning" className="mt-4">
              Unsaved quantity changes.
            </Callout>
          )}
          <Link
            to={`/app/leads/${quote.leadId}`}
            className="mt-5 block text-[13px] font-medium text-botanical hover:underline"
          >
            Open lead {quote.leadId}
          </Link>
        </Panel>
      </div>

      <DocumentPreview
        open={modal === "preview"}
        onClose={() => setModal(null)}
        title={`Quotation ${quote.id}`}
        html={quotationHtml(db, { ...quote, items, totals })}
        filename={`${quote.id}.html`}
      />
      <ConfirmationDialog
        open={modal === "accept"}
        onClose={() => setModal(null)}
        title="Record customer acceptance?"
        description="Use when the customer accepts by phone or in person. Customers can also accept in their portal."
        confirmLabel="Mark accepted"
        onConfirm={() =>
          run("accept", () => acceptQuotation(quote.id), "Quotation accepted")
        }
      />
      <ConfirmationDialog
        open={modal === "reject"}
        onClose={() => setModal(null)}
        tone="danger"
        title="Reject quotation?"
        confirmLabel="Reject"
        reasonLabel="Reason"
        reasonRequired
        onConfirm={(r) =>
          run(
            "reject",
            () => rejectQuotation(quote.id, r),
            "Quotation rejected",
          )
        }
      />
      <Modal
        open={modal === "convert"}
        onClose={() => setModal(null)}
        title="Convert to sales order"
        description="Record the advance payment. The sales order, installation record and asset reference are created together."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={pending === "convert"}
              onClick={() =>
                run(
                  "convert",
                  () =>
                    convertToSalesOrder(quote.id, {
                      amount: Number(pay.amount),
                      method: pay.method,
                      reference: pay.reference,
                    }),
                  (so) => `Sales order ${so} created`,
                )
                  .then((so) => navigate(`/app/orders/${so}`))
                  .catch(() => undefined)
              }
            >
              Record advance & create order
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Advance amount"
            required
            hint={`Suggested ${inr(quote.totals.advance)} of ${inr(quote.totals.total)}`}
          >
            <TextInput
              prefix="₹"
              inputMode="numeric"
              value={pay.amount}
              onChange={(e) =>
                setPay({ ...pay, amount: e.target.value.replace(/\D/g, "") })
              }
            />
          </FormField>
          <FormField label="Payment method" required>
            <SelectInput
              value={pay.method}
              onChange={(e) =>
                setPay({ ...pay, method: e.target.value as Payment["method"] })
              }
              options={["UPI", "Bank Transfer", "Cheque", "Cash", "Card"]}
            />
          </FormField>
          <FormField
            label="Reference (UTR / cheque no.)"
            required
            className="sm:col-span-2"
          >
            <TextInput
              value={pay.reference}
              onChange={(e) => setPay({ ...pay, reference: e.target.value })}
              placeholder="e.g. UTR4512039876"
            />
          </FormField>
        </div>
      </Modal>
    </>
  )
}
