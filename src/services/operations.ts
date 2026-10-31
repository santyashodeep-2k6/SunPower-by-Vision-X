import type {
  ChecklistKey,
  DemoDB,
  Payment,
  Photo,
  TechnicianAssignment,
  TestResults,
} from "@/lib/types"
import { addDays, uid } from "@/lib/format"
import {
  AUTO_CHECKLIST,
  byId,
  installationEvidence,
  installationMissing,
  orderStockCheck,
  paidForOrder,
  productOf,
  stockOf,
} from "@/lib/rules"
import { nextId, nextSerial } from "@/data/ids"
import { command, logActivity, notFound, notify, nowIso, rule } from "./core"

/* ================================= Orders ================================= */

export function recordPayment(
  salesOrderId: string,
  p: Pick<Payment, "amount" | "method" | "reference" | "kind">,
) {
  return command(
    { method: "POST", path: `/sales-orders/${salesOrderId}/payments`, body: p },
    (db) => {
      const so = byId(db.salesOrders, salesOrderId) ?? notFound("Sales order")
      const outstanding = so.total - paidForOrder(db, so.id)
      if (!(p.amount > 0))
        rule("INVALID_AMOUNT", "Payment amount must be greater than zero.")
      if (p.amount > outstanding)
        rule(
          "OVERPAYMENT",
          `Amount exceeds the outstanding balance of ₹${outstanding.toLocaleString("en-IN")}.`,
        )
      if (!p.reference.trim())
        rule("REFERENCE_REQUIRED", "Enter the payment reference.")
      db.payments.unshift({
        id: nextId(db, "PAY"),
        salesOrderId,
        customerId: so.customerId,
        ...p,
        reference: p.reference.trim(),
        at: nowIso(),
      })
      if (p.amount === outstanding && so.status === "Installed")
        so.status = "Closed"
      logActivity(
        db,
        "order",
        so.id,
        so.customerId,
        `${p.kind} payment of ₹${p.amount.toLocaleString("en-IN")} recorded (${p.method})`,
      )
    },
  )
}

/** Checks availability for the whole BOM. Reserves everything only when nothing is short. */
export function checkAndReserveStock(salesOrderId: string) {
  return command(
    { method: "POST", path: `/sales-orders/${salesOrderId}/reserve-stock` },
    (db) => {
      const so = byId(db.salesOrders, salesOrderId) ?? notFound("Sales order")
      if (!["Confirmed", "Awaiting Stock"].includes(so.status))
        return {
          reserved: so.status === "Stock Reserved",
          shortages: [] as { productId: string; shortage: number }[],
        }
      const check = orderStockCheck(db, salesOrderId)
      const shortages = check
        .filter((c) => c.shortage > 0)
        .map((c) => ({ productId: c.productId, shortage: c.shortage }))
      if (shortages.length) {
        so.status = "Awaiting Stock"
        logActivity(
          db,
          "order",
          so.id,
          so.customerId,
          `Stock check: ${shortages.length} item(s) short`,
        )
        return { reserved: false, shortages }
      }
      db.reservations = db.reservations.filter((r) => r.salesOrderId !== so.id)
      for (const l of so.bom) {
        db.reservations.push({
          id: uid(),
          salesOrderId: so.id,
          productId: l.productId,
          qty: l.qty,
        })
        db.movements.unshift({
          id: uid(),
          productId: l.productId,
          qty: l.qty,
          type: "Reserved",
          reference: so.id,
          at: nowIso(),
        })
      }
      so.status = "Stock Reserved"
      logActivity(
        db,
        "order",
        so.id,
        so.customerId,
        "Stock checked and reserved for all BOM items",
      )
      return { reserved: true, shortages }
    },
  )
}

export function raiseShortagePurchase(salesOrderId: string) {
  return command(
    { method: "POST", path: `/sales-orders/${salesOrderId}/purchase-requests` },
    (db) => {
      const so = byId(db.salesOrders, salesOrderId) ?? notFound("Sales order")
      const shortages = orderStockCheck(db, salesOrderId).filter(
        (c) => c.shortage > 0,
      )
      if (!shortages.length)
        rule("NO_SHORTAGE", "There is no shortage for this order.")
      const existing = db.purchaseOrders.filter(
        (p) =>
          p.salesOrderId === so.id &&
          p.status !== "Received" &&
          p.status !== "Cancelled",
      )
      const bySupplier = new Map<string, { productId: string; qty: number }[]>()
      for (const s of shortages) {
        const covered = existing
          .flatMap((p) => p.lines)
          .filter((l) => l.productId === s.productId)
          .reduce((a, l) => a + l.qty - l.received, 0)
        const need = s.shortage - covered
        if (need <= 0) continue
        const p = productOf(db, s.productId)!
        bySupplier.set(p.supplierId, [
          ...(bySupplier.get(p.supplierId) ?? []),
          { productId: p.id, qty: need },
        ])
      }
      if (!bySupplier.size)
        rule(
          "ALREADY_REQUESTED",
          "Purchase requests already cover this shortage.",
        )
      const ids: string[] = []
      for (const [supplierId, lines] of bySupplier) {
        const id = nextId(db, "PO")
        ids.push(id)
        db.purchaseOrders.unshift({
          id,
          supplierId,
          status: "Requested",
          lines: lines.map((l) => ({
            ...l,
            received: 0,
            unitCost: productOf(db, l.productId)!.unitCost,
          })),
          reason: `Shortage for ${so.id}`,
          salesOrderId: so.id,
          createdAt: nowIso(),
        })
        logActivity(
          db,
          "purchase",
          id,
          so.customerId,
          `Purchase request raised for ${so.id} shortage`,
        )
      }
      notify(db, {
        title: "Purchase request raised",
        body: ids.join(", "),
        link: "/app/purchases",
        roles: ["admin", "inventory"],
      })
      return ids
    },
  )
}

/* ================================ Purchases =============================== */

export function createPurchaseRequest(input: {
  supplierId: string
  lines: { productId: string; qty: number }[]
  reason: string
}) {
  return command(
    { method: "POST", path: "/purchase-orders", body: input },
    (db) => {
      const lines = input.lines.filter((l) => l.qty > 0)
      if (!lines.length)
        rule("NO_LINES", "Add at least one product with a quantity.")
      if (!input.reason.trim())
        rule("REASON_REQUIRED", "Add a reason for the purchase request.")
      const id = nextId(db, "PO")
      db.purchaseOrders.unshift({
        id,
        supplierId: input.supplierId,
        status: "Requested",
        lines: lines.map((l) => ({
          ...l,
          received: 0,
          unitCost: productOf(db, l.productId)!.unitCost,
        })),
        reason: input.reason.trim(),
        createdAt: nowIso(),
      })
      logActivity(db, "purchase", id, undefined, "Purchase request created")
      return id
    },
  )
}

export function markPurchaseOrdered(id: string) {
  return command(
    { method: "POST", path: `/purchase-orders/${id}/order` },
    (db) => {
      const po = byId(db.purchaseOrders, id) ?? notFound("Purchase order")
      if (po.status !== "Requested")
        rule(
          "INVALID_TRANSITION",
          "Only requested purchases can be placed with the supplier.",
        )
      po.status = "Ordered"
      po.expectedAt = addDays(
        nowIso(),
        byId(db.suppliers, po.supplierId)?.leadTimeDays ?? 7,
      )
      logActivity(
        db,
        "purchase",
        id,
        undefined,
        "Purchase order placed with supplier",
      )
    },
  )
}

export function cancelPurchase(id: string) {
  return command(
    { method: "POST", path: `/purchase-orders/${id}/cancel` },
    (db) => {
      const po = byId(db.purchaseOrders, id) ?? notFound("Purchase order")
      if (po.lines.some((l) => l.received > 0))
        rule(
          "PARTIALLY_RECEIVED",
          "A partially received order cannot be cancelled.",
        )
      po.status = "Cancelled"
    },
  )
}

export function receivePurchase(id: string, receipts: Record<string, number>) {
  return command(
    { method: "POST", path: `/purchase-orders/${id}/receipts`, body: receipts },
    (db) => {
      const po = byId(db.purchaseOrders, id) ?? notFound("Purchase order")
      if (!["Ordered", "Partially Received"].includes(po.status))
        rule(
          "INVALID_TRANSITION",
          "Place the order with the supplier before receiving goods.",
        )
      let total = 0
      const newSerials: string[] = []
      for (const line of po.lines) {
        const qty = Math.round(receipts[line.productId] ?? 0)
        if (qty < 0)
          rule("INVALID_QTY", "Received quantity cannot be negative.")
        if (qty > line.qty - line.received)
          rule(
            "OVER_RECEIPT",
            `Cannot receive more than the ${line.qty - line.received} pending for ${productOf(db, line.productId)?.name}.`,
          )
        if (!qty) continue
        total += qty
        line.received += qty
        const p = productOf(db, line.productId)!
        if (p.serialized) {
          for (let i = 0; i < qty; i++) {
            const serial = nextSerial(db, p)
            newSerials.push(serial)
            db.units.push({
              serial,
              productId: p.id,
              status: "In Stock",
              receivedAt: nowIso(),
              purchaseOrderId: po.id,
            })
          }
        } else p.onHand += qty
        db.movements.unshift({
          id: uid(),
          productId: p.id,
          qty,
          type: "Received",
          reference: po.id,
          at: nowIso(),
        })
      }
      if (!total)
        rule("NOTHING_RECEIVED", "Enter at least one received quantity.")
      po.status = po.lines.every((l) => l.received >= l.qty)
        ? "Received"
        : "Partially Received"
      logActivity(
        db,
        "purchase",
        id,
        undefined,
        `Goods received (${total} units)`,
      )
      const waiting = db.salesOrders.filter(
        (s) => s.status === "Awaiting Stock",
      )
      if (waiting.length)
        notify(db, {
          title: "Stock received",
          body: `Re-check stock for ${waiting.map((w) => w.id).join(", ")}`,
          link: `/app/orders/${waiting[0].id}`,
          roles: ["admin", "inventory"],
        })
      return newSerials
    },
  )
}

export function adjustStock(productId: string, delta: number, reason: string) {
  return command(
    {
      method: "POST",
      path: `/products/${productId}/adjustments`,
      body: { delta, reason },
    },
    (db) => {
      const p = productOf(db, productId) ?? notFound("Product")
      if (p.serialized)
        rule(
          "SERIALIZED",
          "Serialized stock changes only through goods receipt, dispatch or returns.",
        )
      if (!reason.trim())
        rule("REASON_REQUIRED", "Record a reason for the adjustment.")
      const s = stockOf(db, productId)
      if (p.onHand + delta < 0)
        rule(
          "NEGATIVE_STOCK",
          `Adjustment would make stock negative (on hand ${p.onHand}).`,
        )
      if (p.onHand + delta < s.reserved)
        rule(
          "RESERVED_STOCK",
          `${s.reserved} ${p.unit} are reserved for orders — stock cannot go below that.`,
        )
      p.onHand += delta
      db.movements.unshift({
        id: uid(),
        productId,
        qty: delta,
        type: "Adjustment",
        reference: reason.trim(),
        at: nowIso(),
      })
      logActivity(
        db,
        "inventory",
        productId,
        undefined,
        `Stock adjusted by ${delta} — ${reason}`,
      )
    },
  )
}

/* ================================ Dispatch ================================ */

export function createDispatch(
  salesOrderId: string,
  vehicle: string,
  driver: string,
) {
  return command(
    {
      method: "POST",
      path: "/dispatches",
      body: { salesOrderId, vehicle, driver },
    },
    (db) => {
      const so = byId(db.salesOrders, salesOrderId) ?? notFound("Sales order")
      if (so.status !== "Stock Reserved") {
        const short = orderStockCheck(db, salesOrderId).filter(
          (c) => c.shortage > 0,
        )
        rule(
          "STOCK_NOT_RESERVED",
          short.length
            ? `Cannot dispatch — ${short.length} item(s) are short: ${short.map((s) => `${productOf(db, s.productId)?.name} (${s.shortage})`).join(", ")}.`
            : "Run the stock check and reserve materials before dispatch.",
        )
      }
      const existing = db.dispatches.find(
        (d) => d.salesOrderId === salesOrderId,
      )
      if (existing)
        rule(
          "DISPATCH_EXISTS",
          `Dispatch ${existing.id} already exists for this order.`,
        )
      if (!vehicle.trim() || !driver.trim())
        rule("DETAILS_REQUIRED", "Vehicle number and driver are required.")
      const id = nextId(db, "DSP")
      db.dispatches.unshift({
        id,
        salesOrderId,
        installationId: so.installationId,
        status: "Draft",
        lines: so.bom.map((l) => ({ ...l, serials: [] })),
        vehicle: vehicle.trim(),
        driver: driver.trim(),
        createdAt: nowIso(),
      })
      logActivity(db, "dispatch", id, so.customerId, "Delivery opened")
      return id
    },
  )
}

function validateSerial(
  db: DemoDB,
  dispatchId: string,
  productId: string,
  serial: string,
) {
  const d = byId(db.dispatches, dispatchId) ?? notFound("Dispatch")
  if (d.status !== "Draft") rule("LOCKED", "Serials are locked after dispatch.")
  const line =
    d.lines.find((l) => l.productId === productId) ??
    rule("NOT_IN_BOM", "This product is not part of the delivery.")
  const s = serial.trim().toUpperCase()
  if (!s) rule("EMPTY_SERIAL", "Scan or enter a serial number.")
  const unit =
    db.units.find((u) => u.serial.toUpperCase() === s) ??
    rule("UNKNOWN_SERIAL", `Serial ${s} is not in inventory.`)
  if (unit.productId !== productId)
    rule(
      "WRONG_PRODUCT",
      `Serial ${s} belongs to “${productOf(db, unit.productId)?.name}”, not “${productOf(db, productId)?.name}”.`,
    )
  if (line.serials.includes(unit.serial))
    rule(
      "DUPLICATE_SERIAL",
      `Serial ${s} is already allocated to this delivery.`,
    )
  const other = db.dispatches.find(
    (x) =>
      x.id !== d.id &&
      x.status === "Draft" &&
      x.lines.some((l) => l.serials.includes(unit.serial)),
  )
  if (other)
    rule("DUPLICATE_SERIAL", `Serial ${s} is already allocated to ${other.id}.`)
  if (unit.status !== "In Stock")
    rule(
      "NOT_AVAILABLE",
      `Serial ${s} is ${unit.status.toLowerCase()} and cannot be dispatched.`,
    )
  if (line.serials.length >= line.qty)
    rule(
      "LINE_FULL",
      `All ${line.qty} units of this item are already allocated.`,
    )
  return { d, line, unit }
}

export function allocateSerial(
  dispatchId: string,
  productId: string,
  serial: string,
) {
  return command(
    {
      method: "POST",
      path: `/dispatches/${dispatchId}/serials`,
      body: { productId, serial },
    },
    (db) => {
      const { line, unit } = validateSerial(db, dispatchId, productId, serial)
      line.serials.push(unit.serial)
      return unit.serial
    },
  )
}

export function removeSerial(
  dispatchId: string,
  productId: string,
  serial: string,
) {
  return command(
    { method: "DELETE", path: `/dispatches/${dispatchId}/serials/${serial}` },
    (db) => {
      const d = byId(db.dispatches, dispatchId) ?? notFound("Dispatch")
      if (d.status !== "Draft")
        rule("LOCKED", "Serials are locked after dispatch.")
      const line = d.lines.find((l) => l.productId === productId)
      if (line) line.serials = line.serials.filter((s) => s !== serial)
    },
  )
}

/** Simulates scanning the next available units (FIFO) when no scanner is attached. */
export function autoAllocate(dispatchId: string, productId: string) {
  return command(
    {
      method: "POST",
      path: `/dispatches/${dispatchId}/serials/auto`,
      body: { productId },
    },
    (db) => {
      const d = byId(db.dispatches, dispatchId) ?? notFound("Dispatch")
      const line =
        d.lines.find((l) => l.productId === productId) ?? notFound("Line")
      const taken = new Set(
        db.dispatches
          .filter((x) => x.status === "Draft")
          .flatMap((x) => x.lines.flatMap((l) => l.serials)),
      )
      const free = db.units
        .filter(
          (u) =>
            u.productId === productId &&
            u.status === "In Stock" &&
            !taken.has(u.serial),
        )
        .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
      const need = line.qty - line.serials.length
      if (free.length < need)
        rule(
          "INSUFFICIENT_STOCK",
          `Only ${free.length} unallocated units in stock; ${need} needed.`,
        )
      line.serials.push(...free.slice(0, need).map((u) => u.serial))
      return need
    },
  )
}

export function confirmDispatch(dispatchId: string) {
  return command(
    { method: "POST", path: `/dispatches/${dispatchId}/confirm` },
    (db) => {
      const d = byId(db.dispatches, dispatchId) ?? notFound("Dispatch")
      if (d.status !== "Draft")
        rule("INVALID_TRANSITION", "This delivery has already been dispatched.")
      const so = byId(db.salesOrders, d.salesOrderId)!
      const problems: string[] = []
      for (const l of d.lines) {
        const p = productOf(db, l.productId)!
        if (p.serialized && l.serials.length !== l.qty)
          problems.push(`${p.name}: ${l.serials.length}/${l.qty} serials`)
        if (!p.serialized && p.onHand < l.qty)
          problems.push(`${p.name}: only ${p.onHand} ${p.unit} on hand`)
      }
      if (problems.length)
        rule("DISPATCH_INCOMPLETE", `Cannot dispatch — ${problems.join("; ")}.`)
      const now = nowIso()
      for (const l of d.lines) {
        const p = productOf(db, l.productId)!
        if (p.serialized) {
          for (const serial of l.serials) {
            const u = db.units.find((x) => x.serial === serial)!
            if (u.status !== "In Stock")
              rule("NOT_AVAILABLE", `Serial ${serial} is no longer in stock.`)
            Object.assign(u, {
              status: "Dispatched",
              salesOrderId: so.id,
              dispatchId: d.id,
              installationId: d.installationId,
            })
          }
        } else p.onHand -= l.qty
        db.movements.unshift({
          id: uid(),
          productId: p.id,
          qty: -l.qty,
          type: "Dispatched",
          reference: d.id,
          at: now,
        })
      }
      db.reservations = db.reservations.filter((r) => r.salesOrderId !== so.id)
      d.status = "Dispatched"
      d.dispatchedAt = now
      so.status = "Dispatched"
      logActivity(
        db,
        "dispatch",
        d.id,
        so.customerId,
        `Dispatched in ${d.vehicle} with ${d.lines.flatMap((l) => l.serials).length} validated serials`,
      )
    },
  )
}

export function confirmDelivery(dispatchId: string, receivedBy: string) {
  return command(
    {
      method: "POST",
      path: `/dispatches/${dispatchId}/deliver`,
      body: { receivedBy },
    },
    (db) => {
      const d = byId(db.dispatches, dispatchId) ?? notFound("Dispatch")
      if (d.status !== "Dispatched")
        rule(
          "INVALID_TRANSITION",
          "Only dispatched deliveries can be confirmed.",
        )
      if (!receivedBy.trim())
        rule("RECEIVER_REQUIRED", "Enter who received the material at site.")
      d.status = "Delivered"
      d.deliveredAt = nowIso()
      d.receivedBy = receivedBy.trim()
      const so = byId(db.salesOrders, d.salesOrderId)!
      so.status = "Delivered"
      const inst = byId(db.installations, d.installationId)
      if (inst?.status === "Awaiting Materials")
        inst.status = "Ready to Schedule"
      logActivity(
        db,
        "dispatch",
        d.id,
        so.customerId,
        `Delivered to site — received by ${receivedBy}`,
      )
      notify(db, {
        title: "Material delivered",
        body: `${inst?.reference} is ready for installation`,
        link: `/app/installations/${d.installationId}`,
        roles: ["admin", "installer"],
      })
    },
  )
}

/* ============================== Installations ============================= */

export function scheduleInstallation(
  id: string,
  input: {
    scheduledAt: string
    expectedCompletion: string
    crew: TechnicianAssignment[]
  },
) {
  return command(
    { method: "POST", path: `/installations/${id}/schedule`, body: input },
    (db) => {
      const inst = byId(db.installations, id) ?? notFound("Installation")
      if (inst.status === "Completed")
        rule("COMPLETED", "Completed installations cannot be rescheduled.")
      if (!input.crew.some((c) => c.role === "Lead"))
        rule("LEAD_REQUIRED", "Assign a lead technician.")
      if (new Date(input.expectedCompletion) < new Date(input.scheduledAt))
        rule(
          "INVALID_DATES",
          "Expected completion must be after the start date.",
        )
      for (const member of input.crew) {
        const dateStr = input.scheduledAt.slice(0, 10)
        const conflict = db.installations.find(
          (other) =>
            other.id !== id &&
            ["Scheduled", "In Progress"].includes(other.status) &&
            other.scheduledAt &&
            other.scheduledAt.slice(0, 10) === dateStr &&
            other.crew.some((c) => c.technicianId === member.technicianId),
        )
        if (conflict) {
          const techName = byId(db.users, member.technicianId)?.name ?? member.technicianId
          rule(
            "CREW_DOUBLE_BOOKED",
            `Technician ${techName} is already assigned to ${conflict.reference} on this date.`,
          )
        }
      }
      inst.scheduledAt = input.scheduledAt
      inst.expectedCompletion = input.expectedCompletion
      inst.crew = input.crew
      if (["Awaiting Materials", "Ready to Schedule"].includes(inst.status))
        inst.status = "Scheduled"
      logActivity(
        db,
        "installation",
        id,
        inst.customerId,
        `Installation scheduled for ${new Date(input.scheduledAt).toLocaleDateString("en-IN")} — lead ${byId(db.users, input.crew.find((c) => c.role === "Lead")!.technicianId)?.name}`,
      )
      notify(db, {
        title: "Job assigned",
        body: `${inst.reference} — ${new Date(input.scheduledAt).toLocaleDateString("en-IN")}`,
        link: "/app/technician",
        roles: ["installer", "admin"],
      })
    },
  )
}

export function startJob(id: string, technicianId: string) {
  return command(
    {
      method: "POST",
      path: `/installations/${id}/start`,
      body: { technicianId },
    },
    (db) => {
      const inst = byId(db.installations, id) ?? notFound("Installation")
      if (!["Scheduled", "Paused"].includes(inst.status))
        rule(
          "INVALID_TRANSITION",
          `A job that is ${inst.status.toLowerCase()} cannot be started.`,
        )
      if (!installationEvidence(db, inst).delivered)
        rule(
          "MATERIALS_PENDING",
          "Material has not been delivered to site yet. Confirm delivery before starting.",
        )
      const ids = inst.crew.length
        ? inst.crew.map((c) => c.technicianId)
        : [technicianId]
      for (const tid of ids)
        if (!inst.timesheets.some((t) => t.technicianId === tid && !t.end))
          inst.timesheets.push({
            id: uid(),
            technicianId: tid,
            start: nowIso(),
          })
      const resumed = inst.status === "Paused"
      inst.status = "In Progress"
      logActivity(
        db,
        "installation",
        id,
        inst.customerId,
        resumed ? "Job resumed" : "Job started on site",
      )
    },
  )
}

export function pauseJob(id: string, reason: string) {
  return command(
    { method: "POST", path: `/installations/${id}/pause`, body: { reason } },
    (db) => {
      const inst = byId(db.installations, id) ?? notFound("Installation")
      if (inst.status !== "In Progress")
        rule("INVALID_TRANSITION", "Only jobs in progress can be paused.")
      const now = nowIso()
      inst.timesheets.forEach((t) => {
        if (!t.end) t.end = now
      })
      inst.status = "Paused"
      logActivity(
        db,
        "installation",
        id,
        inst.customerId,
        `Job paused${reason ? ` — ${reason}` : ""}`,
      )
    },
  )
}

function syncAutoChecklist(db: DemoDB, id: string) {
  const inst = byId(db.installations, id)!
  const ev = installationEvidence(db, inst)
  inst.checklist.serials = ev.serialsOk
  inst.checklist.photos = ev.photosOk
  inst.checklist.signature = ev.signatureOk
}

const assertWorkable = (status: string) => {
  if (status === "Completed") rule("LOCKED", "The job is completed and locked.")
  if (status !== "In Progress")
    rule(
      "NOT_STARTED",
      "Start (or resume) the job before updating the worksheet.",
    )
}

export function setChecklistItem(
  id: string,
  key: ChecklistKey,
  value: boolean,
) {
  return command(
    {
      method: "PUT",
      path: `/installations/${id}/checklist/${key}`,
      body: { value },
    },
    (db) => {
      const inst = byId(db.installations, id) ?? notFound("Installation")
      assertWorkable(inst.status)
      if ((AUTO_CHECKLIST as readonly string[]).includes(key))
        rule(
          "EVIDENCE_REQUIRED",
          "This item completes automatically when the evidence is captured.",
        )
      if (key === "generation" && value && !inst.tests)
        rule(
          "TESTS_REQUIRED",
          "Record test results before marking the generation test complete.",
        )
      inst.checklist[key] = value
    },
  )
}

export function addInstallationPhoto(id: string, photo: Photo) {
  return command(
    { method: "POST", path: `/installations/${id}/photos`, body: photo },
    (db) => {
      const inst = byId(db.installations, id) ?? notFound("Installation")
      assertWorkable(inst.status)
      inst.photos.push(photo)
      syncAutoChecklist(db, id)
    },
  )
}

export function removeInstallationPhoto(id: string, photoId: string) {
  return command(
    { method: "DELETE", path: `/installations/${id}/photos/${photoId}` },
    (db) => {
      const inst = byId(db.installations, id) ?? notFound("Installation")
      assertWorkable(inst.status)
      inst.photos = inst.photos.filter((p) => p.id !== photoId)
      syncAutoChecklist(db, id)
    },
  )
}

export function verifyInstalledSerial(id: string, serial: string) {
  return command(
    { method: "POST", path: `/installations/${id}/serials`, body: { serial } },
    (db) => {
      const inst = byId(db.installations, id) ?? notFound("Installation")
      assertWorkable(inst.status)
      const s = serial.trim().toUpperCase()
      const ev = installationEvidence(db, inst)
      const match = ev.expectedSerials.find((x) => x.toUpperCase() === s)
      if (!match) {
        const unit = db.units.find((u) => u.serial.toUpperCase() === s)
        rule(
          "SERIAL_MISMATCH",
          unit
            ? `Serial ${s} was not dispatched to this installation (status: ${unit.status}).`
            : `Serial ${s} is not recognised.`,
        )
      }
      if (inst.verifiedSerials.includes(match))
        rule("DUPLICATE_SERIAL", `Serial ${s} has already been verified.`)
      inst.verifiedSerials.push(match)
      syncAutoChecklist(db, id)
      return (
        productOf(db, db.units.find((u) => u.serial === match)!.productId)
          ?.name ?? ""
      )
    },
  )
}

export function recordTests(
  id: string,
  tests: Omit<TestResults, "recordedAt">,
) {
  return command(
    { method: "PUT", path: `/installations/${id}/tests`, body: tests },
    (db) => {
      const inst = byId(db.installations, id) ?? notFound("Installation")
      assertWorkable(inst.status)
      if (!(tests.generationKw > 0))
        rule("INVALID_TEST", "Generation must be greater than 0 kW.")
      if (tests.generationKw > inst.capacity * 1.15)
        rule(
          "INVALID_TEST",
          `Generation of ${tests.generationKw} kW exceeds the ${inst.capacity} kW system rating — please re-check.`,
        )
      if (tests.insulationMOhm < 1)
        rule(
          "SAFETY_FAIL",
          "Insulation resistance below 1 MΩ fails the safety check. Fix wiring before continuing.",
        )
      if (tests.earthingOhm > 5)
        rule(
          "SAFETY_FAIL",
          "Earthing resistance above 5 Ω fails the safety check.",
        )
      inst.tests = { ...tests, recordedAt: nowIso() }
    },
  )
}

export function captureSignature(id: string, name: string, dataUrl: string) {
  return command(
    {
      method: "PUT",
      path: `/installations/${id}/signature`,
      body: { name, dataUrl },
    },
    (db) => {
      const inst = byId(db.installations, id) ?? notFound("Installation")
      assertWorkable(inst.status)
      if (!name.trim())
        rule("NAME_REQUIRED", "Enter the name of the person signing.")
      inst.signature = { name: name.trim(), dataUrl, at: nowIso() }
      syncAutoChecklist(db, id)
    },
  )
}

export function completeInstallation(id: string) {
  return command(
    { method: "POST", path: `/installations/${id}/complete` },
    (db) => {
      const inst = byId(db.installations, id) ?? notFound("Installation")
      assertWorkable(inst.status)
      syncAutoChecklist(db, id)
      const missing = installationMissing(db, inst)
      if (missing.length)
        rule(
          "MISSING_EVIDENCE",
          `Cannot complete — missing: ${missing.join(", ")}.`,
        )
      const now = nowIso()
      inst.timesheets.forEach((t) => {
        if (!t.end) t.end = now
      })
      inst.status = "Completed"
      inst.completedAt = now
      inst.commissioning = {
        commissionedAt: now,
        generationKw: inst.tests!.generationKw,
        handoverBy:
          inst.crew.find((c) => c.role === "Lead")?.technicianId ?? "",
      }
      const ev = installationEvidence(db, inst)
      for (const serial of ev.expectedSerials) {
        const u = db.units.find((x) => x.serial === serial)!
        u.status = "Installed"
        const p = productOf(db, u.productId)!
        if (!db.warranties.some((w) => w.serial === serial))
          db.warranties.push({
            id: nextId(db, "WAR", 5),
            serial,
            productId: p.id,
            installationId: id,
            customerId: inst.customerId,
            start: now,
            end: addDays(now, Math.round(p.warrantyMonths * 30.44)),
            terms: p.warrantyTerms,
          })
      }
      db.warranties.push({
        id: nextId(db, "WAR", 5),
        serial: inst.reference,
        productId: "WORKMANSHIP",
        installationId: id,
        customerId: inst.customerId,
        start: now,
        end: addDays(now, Math.round(60 * 30.44)),
        terms: "5-year installation workmanship warranty",
      })
      const so = byId(db.salesOrders, inst.salesOrderId)!
      so.status = paidForOrder(db, so.id) >= so.total ? "Closed" : "Installed"
      const site = byId(db.sites, inst.siteId)
      if (
        inst.systemType === "On-Grid" &&
        site?.propertyType === "Residential" &&
        !db.subsidies.some((s) => s.installationId === id)
      ) {
        db.subsidies.push({
          id: nextId(db, "SUB"),
          installationId: id,
          customerId: inst.customerId,
          scheme: "PM Surya Ghar (sample tracking)",
          status: "Not Applied",
          amount:
            inst.capacity === 1 ? 30000 : inst.capacity === 2 ? 60000 : 78000,
          updatedAt: now,
        })
      }
      logActivity(
        db,
        "installation",
        id,
        inst.customerId,
        "Installation completed — customer accepted, warranties activated",
      )
      notify(db, {
        title: "Installation completed",
        body: `${inst.reference} handed over to ${byId(db.customers, inst.customerId)?.name}`,
        link: `/app/installations/${id}`,
        roles: ["admin", "sales", "customer"],
      })
    },
  )
}

export function updateSubsidy(
  subsidyId: string,
  status: DemoDB["subsidies"][number]["status"],
) {
  return command(
    { method: "PATCH", path: `/subsidies/${subsidyId}`, body: { status } },
    (db) => {
      const s = byId(db.subsidies, subsidyId) ?? notFound("Subsidy record")
      s.status = status
      s.updatedAt = nowIso()
      logActivity(
        db,
        "installation",
        s.installationId,
        s.customerId,
        `Subsidy status updated to ${status}`,
      )
    },
  )
}
