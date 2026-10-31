import { useState } from "react"
import { Link, useParams } from "react-router"
import {
  CheckCircle2,
  ClipboardList,
  Hammer,
  PhoneCall,
  Play,
  Send,
  StickyNote,
  UserCog,
  XCircle,
} from "lucide-react"
import type { Repair } from "@/lib/types"
import { fmtDateTime, inr, relative } from "@/lib/format"
import { productOf } from "@/lib/rules"
import { useDb } from "@/data/store"
import {
  addTicketNote,
  assignTicket,
  closeTicket,
  confirmRepair,
  decideEstimate,
  recordDiagnosis,
  recordRepair,
  requestCustomerConfirmation,
  startRepair,
} from "@/services/aftersales"
import { useAction } from "@/lib/useAction"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button, ButtonLink } from "@/components/ui/Button"
import {
  Callout,
  EmptyState,
  Spinner,
  StatusBadge,
} from "@/components/ui/feedback"
import { ActivityTimeline, KeyValueGrid, Panel } from "@/components/ui/data"
import {
  ChoiceCards,
  FormField,
  SearchableDropdown,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/ui/forms"
import { ConfirmationDialog, Modal } from "@/components/ui/overlays"
import { WarrantyCard } from "@/components/special/WarrantyCard"
import { useWarrantyCheck } from "@/components/special/useWarrantyCheck"
import { TextModal } from "../crm/LeadDetailPage"

export default function TicketDetailPage() {
  const { id } = useParams()
  const db = useDb()
  const { run, fire, pending } = useAction()
  const t = db.serviceTickets.find((x) => x.id === id)
  const inst = t && db.installations.find((i) => i.id === t.installationId)
  const { result, loading } = useWarrantyCheck(t?.serial ?? inst?.reference)
  const [modal, setModal] =
    useState<null | "assign" | "diag" | "repair" | "close" | "note" | "approve" | "decline" | "confirm">(
      null,
    )
  const [tech, setTech] = useState(t?.assignedTo ?? "U-18")
  const [diag, setDiag] = useState({
    diagnosis: t?.diagnosis ?? "",
    coverage: (t?.coverage ?? "") as "" | "Covered" | "Chargeable",
    estimate: String(t?.estimate?.amount ?? ""),
  })
  const [rep, setRep] = useState({
    action: "Repaired" as Repair["action"],
    notes: "",
    replacementSerial: "",
    labourHours: "2",
    partId: "",
    partQty: "1",
  })
  const [pay, setPay] = useState({ method: "UPI" as "UPI", reference: "" })
  if (!t || !inst)
    return (
      <EmptyState
        title="Ticket not found"
        action={
          <ButtonLink to="/app/service-tickets" variant="dark" size="sm">
            Back
          </ButtonLink>
        }
      />
    )
  const c = db.customers.find((x) => x.id === t.customerId)!
  const unit = db.units.find((u) => u.serial === t.serial)
  const product = unit && productOf(db, unit.productId)
  const spares = unit
    ? db.units
        .filter(
          (u) => u.productId === unit.productId && u.status === "In Stock",
        )
        .map((u) => ({ value: u.serial, label: u.serial }))
    : []
  const repl = db.replacements.filter(
    (r) =>
      r.serviceTicketId === t.id ||
      r.originalSerial === t.serial ||
      r.replacementSerial === t.serial,
  )
  const closed = t.status === "Closed"
  const suggested = result?.covered ? "Covered" : "Chargeable"
  const openDiag = () => (
    setDiag({
      diagnosis: t.diagnosis ?? "",
      coverage: t.coverage ?? suggested,
      estimate: String(t.estimate?.amount ?? ""),
    }),
    setModal("diag")
  )

  const next: Record<string, React.ReactNode> = {
    Open: (
      <Button
        size="sm"
        variant="dark"
        icon={<UserCog className="h-4 w-4" />}
        onClick={() => setModal("assign")}
      >
        Assign technician
      </Button>
    ),
    Assigned: (
      <Button
        size="sm"
        variant="dark"
        icon={<ClipboardList className="h-4 w-4" />}
        onClick={openDiag}
      >
        Record diagnosis
      </Button>
    ),
    Diagnosed: (
      <Button
        size="sm"
        variant="primary"
        icon={<Play className="h-4 w-4" />}
        loading={pending === "start"}
        onClick={() => fire("start", () => startRepair(t.id), "Repair started")}
      >
        Start repair
      </Button>
    ),
    "Awaiting Approval": (
      <Button
        size="sm"
        variant="primary"
        icon={<Play className="h-4 w-4" />}
        disabledReason="The customer has not approved the chargeable estimate yet"
      >
        Start repair
      </Button>
    ),
    "In Repair": t.repair ? (
      <Button
        size="sm"
        variant="dark"
        icon={<Send className="h-4 w-4" />}
        loading={pending === "req"}
        onClick={() =>
          fire(
            "req",
            () => requestCustomerConfirmation(t.id),
            "Customer confirmation requested",
          )
        }
      >
        Request customer confirmation
      </Button>
    ) : (
      <Button
        size="sm"
        variant="dark"
        icon={<Hammer className="h-4 w-4" />}
        onClick={() => setModal("repair")}
      >
        Record repair
      </Button>
    ),
    "Awaiting Confirmation": t.customerConfirmedAt ? (
      <Button
        size="sm"
        variant="primary"
        icon={<CheckCircle2 className="h-4 w-4" />}
        onClick={() => setModal("close")}
      >
        Close ticket
      </Button>
    ) : (
      <Button
        size="sm"
        variant="primary"
        disabledReason="Waiting for the customer to confirm the repair"
      >
        Close ticket
      </Button>
    ),
  }

  return (
    <>
      <PageHeader
        back={{ to: "/app/service-tickets", label: "Service tickets" }}
        eyebrow={`${t.id} · ${inst.reference} · raised ${relative(t.createdAt)} by ${t.raisedBy}`}
        title={c.name}
        badges={
          <>
            <StatusBadge status={t.status} />
            <StatusBadge status={t.priority} />
            {t.coverage && <StatusBadge status={t.coverage} />}
          </>
        }
        description={t.issue}
        actions={
          <>
            {!closed && t.status !== "Open" && (
              <Button
                size="sm"
                icon={<UserCog className="h-4 w-4" />}
                onClick={() => setModal("assign")}
              >
                Reassign
              </Button>
            )}
            {["Assigned", "Diagnosed"].includes(t.status) &&
              t.status === "Diagnosed" && (
                <Button size="sm" onClick={openDiag}>
                  Edit diagnosis
                </Button>
              )}
            {t.status === "In Repair" && t.repair && (
              <Button size="sm" onClick={() => setModal("repair")} disabled>
                Repair recorded
              </Button>
            )}
            <Button
              size="sm"
              icon={<StickyNote className="h-4 w-4" />}
              onClick={() => setModal("note")}
            >
              Add note
            </Button>
            {next[t.status]}
          </>
        }
      />
      {t.status === "Awaiting Approval" && (
        <Callout
          tone="warning"
          title={`Chargeable estimate ${inr(t.estimate!.amount)} awaiting customer approval`}
          className="mb-5"
          action={
            <div className="flex gap-2">
              <Button
                size="sm"
                icon={<PhoneCall className="h-4 w-4" />}
                onClick={() => setModal("approve")}
              >
                Record approval (phone)
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setModal("decline")}
              >
                Declined
              </Button>
            </div>
          }
        >
          Repair cannot start until the customer approves. Customers can approve
          from their portal.
        </Callout>
      )}
      {t.status === "Awaiting Confirmation" && !t.customerConfirmedAt && (
        <Callout
          tone="warning"
          title="Waiting for customer confirmation"
          className="mb-5"
          action={
            <Button
              size="sm"
              icon={<PhoneCall className="h-4 w-4" />}
              onClick={() => setModal("confirm")}
            >
              Record confirmation (phone)
            </Button>
          }
        >
          The customer can confirm from their portal.
        </Callout>
      )}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel
            title="Warranty verification"
            description={
              t.serial
                ? `Selected component ${product?.name} · ${t.serial}`
                : "General / workmanship warranty"
            }
          >
            {loading ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : result ? (
              <WarrantyCard v={result} />
            ) : (
              <p className="text-sm text-muted">No warranty record found.</p>
            )}
            {result && (
              <div className="mt-4">
                {result.covered ? (
                  <Callout tone="success" title="Covered repair path">
                    Repair or replacement under warranty. Customer charge:{" "}
                    {inr(t.coverage === "Chargeable" ? t.customerCharge : 0)}. A
                    covered replacement continues the original warranty term.
                  </Callout>
                ) : (
                  <Callout tone="warning" title="Chargeable estimate workflow">
                    Warranty is{" "}
                    {result.state === "Not Found"
                      ? "not on record"
                      : result.state.toLowerCase()}
                    . Record a diagnosis with an estimate — the customer must
                    approve before work starts.
                  </Callout>
                )}
              </div>
            )}
          </Panel>
          <Panel title="Diagnosis & repair">
            <KeyValueGrid
              items={[
                {
                  label: "Technician",
                  value: db.users.find((u) => u.id === t.assignedTo)?.name,
                },
                { label: "Coverage", value: t.coverage },
                { label: "Diagnosis", value: t.diagnosis },
                {
                  label: "Estimate",
                  value: t.estimate
                    ? `${inr(t.estimate.amount)} · ${
                        t.estimate.approved === undefined
                          ? "awaiting approval"
                          : t.estimate.approved
                            ? "approved"
                            : "declined"
                      }`
                    : t.coverage === "Covered"
                      ? "Not required"
                      : undefined,
                },
                {
                  label: "Repair",
                  value: t.repair
                    ? `${t.repair.action} — ${t.repair.notes}`
                    : undefined,
                },
                {
                  label: "Parts & labour",
                  value: t.repair
                    ? `${t.parts.map((p) => `${productOf(db, p.productId)?.name} ×${p.qty}`).join(", ") || "No parts"} · ${t.labourHours} h`
                    : undefined,
                },
                { label: "Customer charge", value: inr(t.customerCharge) },
                {
                  label: "Customer confirmed",
                  value: t.customerConfirmedAt
                    ? fmtDateTime(t.customerConfirmedAt)
                    : undefined,
                },
              ]}
            />
          </Panel>
          {t.photos.length > 0 && (
            <Panel title="Photographs">
              <ul className="grid grid-cols-3 gap-2">
                {t.photos.map((p) => (
                  <li key={p.id}>
                    <img
                      src={p.url}
                      alt={p.caption}
                      className="aspect-[4/3] w-full rounded-xl object-cover"
                    />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
        <div className="space-y-5">
          <Panel title="Replacement history">
            {repl.length === 0 ? (
              <p className="text-sm text-muted">
                No replacements for this component.
              </p>
            ) : (
              repl.map((r) => (
                <div
                  key={r.id}
                  className="mb-2 rounded-2xl border border-forest/8 p-3 text-[13px]"
                >
                  <p className="font-medium">
                    {productOf(db, r.productId)?.name}
                  </p>
                  <p className="font-mono">
                    <span className="text-muted line-through">
                      {r.originalSerial}
                    </span>{" "}
                    →{" "}
                    <span className="text-[#17673F]">
                      {r.replacementSerial}
                    </span>
                  </p>
                  <p className="text-[12px] text-muted">
                    {fmtDateTime(r.at)} · original retained as faulty return
                  </p>
                </div>
              ))
            )}
            <Link
              to={`/app/passport/${inst.reference}`}
              className="mt-2 block text-[13px] font-medium text-botanical hover:underline"
            >
              Open asset passport
            </Link>
          </Panel>
          <Panel title="Ticket log">
            <ActivityTimeline
              items={t.log.map((l) => ({
                id: l.id,
                text: l.text,
                actor: l.authorName,
                at: l.at,
              }))}
            />
          </Panel>
        </div>
      </div>

      <Modal
        open={modal === "assign"}
        onClose={() => setModal(null)}
        size="sm"
        title="Assign service technician"
        footer={
          <Button
            variant="dark"
            loading={pending === "assign"}
            onClick={() =>
              run(
                "assign",
                () => assignTicket(t.id, tech),
                "Technician assigned",
              )
                .then(() => setModal(null))
                .catch(() => undefined)
            }
          >
            Assign
          </Button>
        }
      >
        <FormField label="Technician" required>
          <SelectInput
            value={tech}
            onChange={(e) => setTech(e.target.value)}
            options={db.users
              .filter((u) => u.role === "service" && u.active)
              .map((u) => ({
                value: u.id,
                label: `${u.name} (${db.serviceTickets.filter((x) => x.assignedTo === u.id && x.status !== "Closed").length} open)`,
              }))}
          />
        </FormField>
      </Modal>
      <Modal
        open={modal === "diag"}
        onClose={() => setModal(null)}
        title="Record diagnosis"
        description={
          result
            ? `Warranty check: ${result.state}${
                result.covered ? " — covered" : " — not covered"
              } (${
                result.verifiedBy === "backend" ? "backend" : "demo service"
              })`
            : undefined
        }
        footer={
          <Button
            variant="dark"
            loading={pending === "diag"}
            onClick={() =>
              run(
                "diag",
                () =>
                  recordDiagnosis(t.id, {
                    diagnosis: diag.diagnosis,
                    coverage: (diag.coverage || suggested) as "Covered",
                    estimate: Number(diag.estimate) || undefined,
                  }),
                diag.coverage === "Chargeable"
                  ? "Estimate sent for customer approval"
                  : "Diagnosis recorded",
              )
                .then(() => setModal(null))
                .catch(() => undefined)
            }
          >
            Save diagnosis
          </Button>
        }
      >
        <div className="space-y-4">
          <FormField label="Diagnosis" required>
            <TextArea
              value={diag.diagnosis}
              onChange={(e) => setDiag({ ...diag, diagnosis: e.target.value })}
              placeholder="What did you find on site?"
            />
          </FormField>
          <ChoiceCards
            name="Coverage"
            columns={2}
            value={diag.coverage || suggested}
            onChange={(v) => setDiag({ ...diag, coverage: v })}
            options={[
              {
                value: "Covered",
                label: "Covered by warranty",
                description: "No charge to the customer",
              },
              {
                value: "Chargeable",
                label: "Chargeable",
                description: "Expired, excluded or customer-caused",
              },
            ]}
          />
          {result &&
            !result.covered &&
            (diag.coverage || suggested) === "Covered" && (
              <Callout tone="warning">
                The warranty check reports “{result.state}”. Marking as covered
                overrides the verification — note the reason in the diagnosis.
              </Callout>
            )}
          {(diag.coverage || suggested) === "Chargeable" && (
            <FormField label="Estimate for customer approval" required>
              <TextInput
                prefix="₹"
                inputMode="numeric"
                value={diag.estimate}
                onChange={(e) =>
                  setDiag({
                    ...diag,
                    estimate: e.target.value.replace(/\D/g, ""),
                  })
                }
              />
            </FormField>
          )}
        </div>
      </Modal>
      <Modal
        open={modal === "repair"}
        onClose={() => setModal(null)}
        title="Record repair"
        footer={
          <Button
            variant="dark"
            loading={pending === "rep"}
            onClick={() =>
              run(
                "rep",
                () =>
                  recordRepair(t.id, {
                    action: rep.action,
                    notes: rep.notes,
                    replacementSerial: rep.replacementSerial || undefined,
                    labourHours: Number(rep.labourHours) || 0,
                    parts: rep.partId
                      ? [
                          {
                            productId: rep.partId,
                            qty: Number(rep.partQty) || 1,
                          },
                        ]
                      : [],
                  }),
                "Repair recorded",
              )
                .then(() => setModal(null))
                .catch(() => undefined)
            }
          >
            Save repair
          </Button>
        }
      >
        <div className="space-y-4">
          <FormField label="Action" required>
            <SelectInput
              value={rep.action}
              onChange={(e) =>
                setRep({ ...rep, action: e.target.value as Repair["action"] })
              }
              options={
                t.serial
                  ? ["Repaired", "Replaced", "Adjusted"]
                  : ["Repaired", "Adjusted"]
              }
            />
          </FormField>
          {rep.action === "Replaced" && (
            <FormField
              label={`Replacement ${product?.name ?? "unit"} serial`}
              required
              hint="Both the original and replacement serials are retained in the history."
            >
              <SearchableDropdown
                options={spares}
                value={rep.replacementSerial}
                onChange={(v) => setRep({ ...rep, replacementSerial: v })}
                placeholder="Search in-stock serials…"
                emptyText="No spare in stock — raise a purchase request"
              />
            </FormField>
          )}
          <FormField label="Work carried out" required>
            <TextArea
              value={rep.notes}
              onChange={(e) => setRep({ ...rep, notes: e.target.value })}
            />
          </FormField>
          <div className="grid grid-cols-[1fr_90px_110px] gap-3">
            <FormField label="Parts used" optional>
              <SelectInput
                value={rep.partId}
                onChange={(e) => setRep({ ...rep, partId: e.target.value })}
                placeholder="None"
                options={db.products
                  .filter((p) => !p.serialized)
                  .map((p) => ({ value: p.id, label: p.name }))}
              />
            </FormField>
            <FormField label="Qty">
              <TextInput
                inputMode="numeric"
                value={rep.partQty}
                onChange={(e) =>
                  setRep({ ...rep, partQty: e.target.value.replace(/\D/g, "") })
                }
              />
            </FormField>
            <FormField label="Labour (h)">
              <TextInput
                inputMode="decimal"
                value={rep.labourHours}
                onChange={(e) =>
                  setRep({
                    ...rep,
                    labourHours: e.target.value.replace(/[^\d.]/g, ""),
                  })
                }
              />
            </FormField>
          </div>
        </div>
      </Modal>
      <Modal
        open={modal === "close"}
        onClose={() => setModal(null)}
        size="sm"
        title="Close ticket"
        footer={
          <Button
            variant="primary"
            loading={pending === "close"}
            onClick={() =>
              run(
                "close",
                () => closeTicket(t.id, t.customerCharge > 0 ? pay : undefined),
                "Ticket closed",
              )
                .then(() => setModal(null))
                .catch(() => undefined)
            }
          >
            Close ticket
          </Button>
        }
      >
        {t.customerCharge > 0 ? (
          <div className="space-y-4">
            <p className="text-sm">
              Collect the approved charge of{" "}
              <strong>{inr(t.customerCharge)}</strong>.
            </p>
            <FormField label="Method">
              <SelectInput
                value={pay.method}
                onChange={(e) =>
                  setPay({ ...pay, method: e.target.value as "UPI" })
                }
                options={["UPI", "Cash", "Card", "Bank Transfer", "Cheque"]}
              />
            </FormField>
            <FormField label="Payment reference" required>
              <TextInput
                value={pay.reference}
                onChange={(e) => setPay({ ...pay, reference: e.target.value })}
              />
            </FormField>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Covered repair — no charge. The customer has confirmed the work.
          </p>
        )}
      </Modal>
      <ConfirmationDialog
        open={modal === "approve"}
        onClose={() => setModal(null)}
        title="Record customer approval?"
        description={`Customer approved ${inr(t.estimate?.amount ?? 0)} by phone.`}
        confirmLabel="Record approval"
        onConfirm={() =>
          run(
            "dec",
            () => decideEstimate(t.id, true),
            "Estimate approved — repair can start",
          )
        }
      />
      <ConfirmationDialog
        open={modal === "decline"}
        onClose={() => setModal(null)}
        tone="danger"
        title="Customer declined the estimate?"
        description="The ticket closes without repair."
        confirmLabel="Record decline"
        onConfirm={() =>
          run(
            "dec",
            () => decideEstimate(t.id, false),
            "Ticket closed — estimate declined",
          )
        }
      />
      <ConfirmationDialog
        open={modal === "confirm"}
        onClose={() => setModal(null)}
        title="Record customer confirmation?"
        description="Use when the customer confirms the repair by phone."
        confirmLabel="Record confirmation"
        onConfirm={() =>
          run(
            "conf",
            () => confirmRepair(t.id, true),
            "Customer confirmation recorded",
          )
        }
      />
      <TextModal
        open={modal === "note"}
        onClose={() => setModal(null)}
        title="Add ticket note"
        label="Note"
        confirm="Save note"
        onSave={(x) => run("note", () => addTicketNote(t.id, x), "Note added")}
      />
      {closed && (
        <span className="sr-only">
          <XCircle />
        </span>
      )}
    </>
  )
}
