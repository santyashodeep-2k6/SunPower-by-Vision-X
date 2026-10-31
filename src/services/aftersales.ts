import type { Photo, Priority, Repair, User } from "@/lib/types"
import { uid } from "@/lib/format"
import {
  byId,
  currentWarrantyForSerial,
  productOf,
  warrantyState,
  type WarrantyState,
} from "@/lib/rules"
import { nextId } from "@/data/ids"
import { isDemoMode } from "./apiClient"
import {
  actorName,
  command,
  logActivity,
  notFound,
  notify,
  nowIso,
  query,
  rule,
} from "./core"

export interface WarrantyVerification {
  warrantyId?: string
  serial: string
  productName: string
  customerName: string
  installationRef: string
  start?: string
  end?: string
  terms?: string
  state: WarrantyState | "Not Found"
  covered: boolean
  /** Who produced this result — the frontend never makes the official decision when a backend exists. */
  verifiedBy: "demo-service" | "backend"
}

export function verifyWarranty(serial: string) {
  return query<WarrantyVerification>(
    {
      method: "GET",
      path: `/warranties/verify?serial=${encodeURIComponent(serial)}`,
    },
    (db) => {
      const w = currentWarrantyForSerial(db, serial)
      const unit = db.units.find((u) => u.serial === serial)
      const inst = byId(
        db.installations,
        w?.installationId ?? unit?.installationId,
      )
      if (!w)
        return {
          serial,
          productName: unit
            ? (productOf(db, unit.productId)?.name ?? "")
            : "Unknown",
          customerName: byId(db.customers, inst?.customerId)?.name ?? "—",
          installationRef: inst?.reference ?? "—",
          state: "Not Found",
          covered: false,
          verifiedBy: "demo-service",
        }
      const state = warrantyState(w)
      return {
        warrantyId: w.id,
        serial,
        productName:
          w.productId === "WORKMANSHIP"
            ? "Installation workmanship"
            : (productOf(db, w.productId)?.name ?? ""),
        customerName: byId(db.customers, w.customerId)?.name ?? "",
        installationRef: inst?.reference ?? "",
        start: w.start,
        end: w.end,
        terms: w.terms,
        state,
        covered: state === "Active" || state === "Expiring Soon",
        verifiedBy: isDemoMode ? "demo-service" : "backend",
      }
    },
  )
}

export interface TicketInput {
  customerId: string
  installationId: string
  serial?: string
  issue: string
  priority: Priority
  photos: Photo[]
  raisedBy: "customer" | "staff"
}

export function createTicket(input: TicketInput) {
  return command(
    { method: "POST", path: "/service-tickets", body: input },
    (db) => {
      if (input.issue.trim().length < 10)
        rule("ISSUE_REQUIRED", "Describe the issue in at least 10 characters.")
      const inst =
        byId(db.installations, input.installationId) ?? notFound("Installation")
      if (inst.customerId !== input.customerId)
        rule("MISMATCH", "The installation does not belong to this customer.")
      if (
        input.serial &&
        !db.units.some(
          (u) =>
            u.serial === input.serial &&
            u.installationId === inst.id &&
            u.status === "Installed",
        )
      )
        rule(
          "SERIAL_MISMATCH",
          "The selected serial is not installed at this site.",
        )
      const w = input.serial
        ? currentWarrantyForSerial(db, input.serial)
        : db.warranties.find(
            (x) =>
              x.installationId === inst.id && x.productId === "WORKMANSHIP",
          )
      const id = nextId(db, "TKT")
      db.serviceTickets.unshift({
        id,
        customerId: input.customerId,
        installationId: inst.id,
        serial: input.serial,
        warrantyId: w?.id,
        issue: input.issue.trim(),
        priority: input.priority,
        status: "Open",
        photos: input.photos,
        parts: [],
        labourHours: 0,
        customerCharge: 0,
        createdAt: nowIso(),
        raisedBy: input.raisedBy,
        log: [
          {
            id: uid(),
            text:
              input.raisedBy === "customer"
                ? "Complaint raised from customer portal"
                : "Ticket created by service desk",
            authorName: actorName(db),
            at: nowIso(),
          },
        ],
      })
      logActivity(
        db,
        "ticket",
        id,
        input.customerId,
        `Service ticket raised: ${input.issue.slice(0, 60)}`,
      )
      notify(db, {
        title: "New service ticket",
        body: `${byId(db.customers, input.customerId)?.name} · ${input.priority}`,
        link: `/app/service-tickets/${id}`,
        roles: ["admin", "service"],
      })
      return id
    },
  )
}

const tlog = (
  t: { log: { id: string; text: string; authorName: string; at: string }[] },
  text: string,
  who: string,
) => t.log.unshift({ id: uid(), text, authorName: who, at: nowIso() })

export function assignTicket(id: string, technicianId: string) {
  return command(
    {
      method: "POST",
      path: `/service-tickets/${id}/assign`,
      body: { technicianId },
    },
    (db) => {
      const t = byId(db.serviceTickets, id) ?? notFound("Ticket")
      if (t.status === "Closed") rule("CLOSED", "Ticket is closed.")
      const tech = byId<User>(db.users, technicianId) ?? notFound("Technician")
      t.assignedTo = technicianId
      if (t.status === "Open") t.status = "Assigned"
      tlog(t, `Assigned to ${tech.name}`, actorName(db))
    },
  )
}

export function recordDiagnosis(
  id: string,
  input: {
    diagnosis: string
    coverage: "Covered" | "Chargeable"
    estimate?: number
  },
) {
  return command(
    { method: "POST", path: `/service-tickets/${id}/diagnosis`, body: input },
    (db) => {
      const t = byId(db.serviceTickets, id) ?? notFound("Ticket")
      if (!["Assigned", "Diagnosed", "Open"].includes(t.status))
        rule(
          "INVALID_TRANSITION",
          `Diagnosis cannot be changed while the ticket is ${t.status.toLowerCase()}.`,
        )
      if (!t.assignedTo)
        rule(
          "UNASSIGNED",
          "Assign a technician before recording the diagnosis.",
        )
      if (input.diagnosis.trim().length < 5)
        rule("DIAGNOSIS_REQUIRED", "Describe the diagnosis.")
      if (
        input.coverage === "Chargeable" &&
        !(input.estimate && input.estimate > 0)
      )
        rule(
          "ESTIMATE_REQUIRED",
          "A chargeable repair needs an estimate for customer approval.",
        )
      t.diagnosis = input.diagnosis.trim()
      t.coverage = input.coverage
      if (input.coverage === "Chargeable") {
        t.estimate = { amount: input.estimate! }
        t.customerCharge = input.estimate!
        t.status = "Awaiting Approval"
        tlog(
          t,
          `Chargeable estimate ₹${input.estimate!.toLocaleString("en-IN")} sent for customer approval`,
          actorName(db),
        )
        notify(db, {
          title: "Repair estimate awaiting your approval",
          body: `${t.id} · ₹${input.estimate!.toLocaleString("en-IN")}`,
          link: "/portal/service",
          roles: ["customer"],
        })
      } else {
        t.estimate = undefined
        t.customerCharge = 0
        t.status = "Diagnosed"
        tlog(t, "Diagnosis recorded — covered repair path", actorName(db))
      }
    },
  )
}

export function decideEstimate(id: string, approved: boolean) {
  return command(
    {
      method: "POST",
      path: `/service-tickets/${id}/estimate-decision`,
      body: { approved },
    },
    (db) => {
      const t = byId(db.serviceTickets, id) ?? notFound("Ticket")
      if (t.status !== "Awaiting Approval" || !t.estimate)
        rule("INVALID_TRANSITION", "There is no estimate awaiting approval.")
      t.estimate.approved = approved
      t.estimate.decidedAt = nowIso()
      if (approved) {
        t.status = "Diagnosed"
        tlog(t, "Customer approved the chargeable estimate", actorName(db))
      } else {
        t.status = "Closed"
        t.closedAt = nowIso()
        t.customerCharge = 0
        tlog(
          t,
          "Customer declined the estimate — ticket closed without repair",
          actorName(db),
        )
      }
      notify(db, {
        title: approved ? "Estimate approved" : "Estimate declined",
        body: t.id,
        link: `/app/service-tickets/${id}`,
        roles: ["admin", "service"],
      })
    },
  )
}

export function startRepair(id: string) {
  return command(
    { method: "POST", path: `/service-tickets/${id}/start-repair` },
    (db) => {
      const t = byId(db.serviceTickets, id) ?? notFound("Ticket")
      if (t.status === "Awaiting Approval")
        rule(
          "UNAPPROVED_CHARGEABLE",
          "The customer has not approved the chargeable estimate yet. Repair cannot start.",
        )
      if (t.status !== "Diagnosed")
        rule(
          "INVALID_TRANSITION",
          "Record a diagnosis before starting the repair.",
        )
      if (t.coverage === "Chargeable" && !t.estimate?.approved)
        rule(
          "UNAPPROVED_CHARGEABLE",
          "Chargeable repairs require customer approval of the estimate.",
        )
      t.status = "In Repair"
      tlog(t, "Repair started", actorName(db))
    },
  )
}

export function recordRepair(
  id: string,
  input: {
    action: Repair["action"]
    notes: string
    replacementSerial?: string
    parts: { productId: string; qty: number }[]
    labourHours: number
  },
) {
  return command(
    { method: "POST", path: `/service-tickets/${id}/repair`, body: input },
    (db) => {
      const t = byId(db.serviceTickets, id) ?? notFound("Ticket")
      if (t.status !== "In Repair")
        rule("INVALID_TRANSITION", "Start the repair before recording it.")
      if (input.notes.trim().length < 5)
        rule("NOTES_REQUIRED", "Describe the work carried out.")
      if (input.labourHours < 0)
        rule("INVALID_HOURS", "Labour hours cannot be negative.")
      const now = nowIso()
      const repair: Repair = {
        action: input.action,
        notes: input.notes.trim(),
        at: now,
      }
      if (input.action === "Replaced") {
        if (!t.serial)
          rule(
            "NO_SERIAL",
            "Select the faulty serial on the ticket before recording a replacement.",
          )
        const original =
          db.units.find((u) => u.serial === t.serial) ??
          notFound("Original unit")
        const rep = db.units.find(
          (u) => u.serial === input.replacementSerial?.trim().toUpperCase(),
        )
        if (!rep)
          rule("UNKNOWN_SERIAL", "Replacement serial is not in inventory.")
        if (rep.productId !== original.productId)
          rule(
            "WRONG_PRODUCT",
            `Replacement must be the same product (${productOf(db, original.productId)?.name}).`,
          )
        if (rep.status !== "In Stock")
          rule(
            "NOT_AVAILABLE",
            `Replacement serial ${rep.serial} is ${rep.status.toLowerCase()}.`,
          )
        original.status = "Faulty Returned"
        Object.assign(rep, {
          status: "Installed",
          installationId: original.installationId,
          salesOrderId: original.salesOrderId,
        })
        repair.originalSerial = original.serial
        repair.replacementSerial = rep.serial
        db.replacements.unshift({
          id: uid(),
          originalSerial: original.serial,
          replacementSerial: rep.serial,
          productId: rep.productId,
          installationId: t.installationId,
          serviceTicketId: t.id,
          at: now,
        })
        db.movements.unshift({
          id: uid(),
          productId: rep.productId,
          qty: -1,
          type: "Replacement Issued",
          reference: t.id,
          serial: rep.serial,
          at: now,
        })
        db.movements.unshift({
          id: uid(),
          productId: original.productId,
          qty: 0,
          type: "Faulty Returned",
          reference: t.id,
          serial: original.serial,
          at: now,
        })
        const oldW = currentWarrantyForSerial(db, original.serial)
        const p = productOf(db, rep.productId)!
        const newId = nextId(db, "WAR", 5)
        if (oldW && t.coverage === "Covered") {
          // Covered replacement continues the original warranty term.
          db.warranties.push({
            ...oldW,
            id: newId,
            serial: rep.serial,
            supersededBy: undefined,
          })
          oldW.supersededBy = newId
        } else {
          if (oldW) oldW.supersededBy = newId
          db.warranties.push({
            id: newId,
            serial: rep.serial,
            productId: p.id,
            installationId: t.installationId,
            customerId: t.customerId,
            start: now,
            end: new Date(
              Date.now() + p.warrantyMonths * 30.44 * 86400000,
            ).toISOString(),
            terms: p.warrantyTerms,
          })
        }
      }
      t.repair = repair
      t.parts = input.parts
        .filter((p) => p.qty > 0)
        .map((p) => ({
          ...p,
          unitCost: productOf(db, p.productId)?.unitCost ?? 0,
        }))
      if (
        input.action === "Replaced" &&
        !t.parts.some(
          (p) =>
            p.productId ===
            db.units.find((u) => u.serial === repair.replacementSerial)
              ?.productId,
        )
      ) {
        const pid = db.units.find(
          (u) => u.serial === repair.replacementSerial,
        )!.productId
        t.parts.push({
          productId: pid,
          qty: 1,
          unitCost: productOf(db, pid)?.unitCost ?? 0,
        })
      }
      t.labourHours = input.labourHours
      tlog(
        t,
        `Repair recorded: ${input.action}${
          repair.replacementSerial
            ? ` ${repair.originalSerial} → ${repair.replacementSerial}`
            : ""
        }`,
        actorName(db),
      )
      logActivity(
        db,
        "ticket",
        t.id,
        t.customerId,
        `Repair recorded (${input.action})`,
      )
    },
  )
}

export function requestCustomerConfirmation(id: string) {
  return command(
    { method: "POST", path: `/service-tickets/${id}/request-confirmation` },
    (db) => {
      const t = byId(db.serviceTickets, id) ?? notFound("Ticket")
      if (t.status !== "In Repair" || !t.repair)
        rule(
          "REPAIR_REQUIRED",
          "Record the repair before requesting customer confirmation.",
        )
      t.status = "Awaiting Confirmation"
      tlog(t, "Customer confirmation requested", actorName(db))
      notify(db, {
        title: "Please confirm your repair",
        body: t.id,
        link: "/portal/service",
        roles: ["customer"],
      })
    },
  )
}

export function confirmRepair(id: string, onBehalf = false) {
  return command(
    {
      method: "POST",
      path: `/service-tickets/${id}/confirm`,
      body: { onBehalf },
    },
    (db) => {
      const t = byId(db.serviceTickets, id) ?? notFound("Ticket")
      if (t.status !== "Awaiting Confirmation")
        rule("INVALID_TRANSITION", "The repair is not awaiting confirmation.")
      t.customerConfirmedAt = nowIso()
      tlog(
        t,
        onBehalf
          ? "Customer confirmation recorded by phone (staff)"
          : "Customer confirmed the repair",
        actorName(db),
      )
    },
  )
}

export function closeTicket(
  id: string,
  payment?: {
    method: "UPI" | "Cash" | "Card" | "Bank Transfer" | "Cheque"
    reference: string
  },
) {
  return command(
    { method: "POST", path: `/service-tickets/${id}/close`, body: payment },
    (db) => {
      const t = byId(db.serviceTickets, id) ?? notFound("Ticket")
      if (t.status !== "Awaiting Confirmation")
        rule(
          "INVALID_TRANSITION",
          "Only repairs awaiting confirmation can be closed.",
        )
      if (!t.customerConfirmedAt)
        rule(
          "CONFIRMATION_REQUIRED",
          "The customer must confirm the repair before the ticket is closed.",
        )
      if (t.customerCharge > 0) {
        if (!payment?.reference.trim())
          rule(
            "PAYMENT_REQUIRED",
            "Record the service payment reference for this chargeable repair.",
          )
        db.payments.unshift({
          id: nextId(db, "PAY"),
          serviceTicketId: t.id,
          customerId: t.customerId,
          amount: t.customerCharge,
          kind: "Service",
          method: payment.method,
          reference: payment.reference.trim(),
          at: nowIso(),
        })
      }
      t.status = "Closed"
      t.closedAt = nowIso()
      tlog(t, "Ticket closed", actorName(db))
      logActivity(db, "ticket", t.id, t.customerId, "Service ticket closed")
    },
  )
}

export function addTicketNote(id: string, text: string) {
  return command(
    { method: "POST", path: `/service-tickets/${id}/notes`, body: { text } },
    (db) => {
      if (!text.trim()) rule("EMPTY_NOTE", "Note cannot be empty.")
      const t = byId(db.serviceTickets, id) ?? notFound("Ticket")
      tlog(t, text.trim(), actorName(db))
    },
  )
}
