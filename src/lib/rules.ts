import type {
  AISummary,
  Customer,
  DemoDB,
  Installation,
  Lead,
  Site,
  Warranty,
} from "./types"
import { CHECKLIST_ITEMS } from "./types"
import { recommendCapacity } from "./catalog"
import { DAY } from "./format"

/* ---------- Lookups ---------- */

export const byId = <T extends { id: string }>(list: T[], id?: string) =>
  id ? list.find((x) => x.id === id) : undefined
export const customerOf = (db: DemoDB, id?: string) => byId(db.customers, id)
export const siteOf = (db: DemoDB, id?: string) => byId(db.sites, id)
export const userName = (db: DemoDB, id?: string) =>
  byId(db.users, id)?.name ?? "Unassigned"
export const productOf = (db: DemoDB, id: string) =>
  db.products.find((p) => p.id === id)
export const productName = (db: DemoDB, id: string) =>
  id === "WORKMANSHIP"
    ? "Installation workmanship"
    : (productOf(db, id)?.name ?? id)

/* ---------- Leads ---------- */

export function missingLeadFields(
  lead: Lead,
  customer?: Customer,
  site?: Site,
) {
  const missing: string[] = []
  if (!customer?.email) missing.push("Email address")
  if (!lead.monthlyBill) missing.push("Monthly electricity bill")
  if (!lead.roofArea) missing.push("Rooftop area")
  if (!lead.systemType) missing.push("On-Grid / Off-Grid preference")
  if (!site?.address) missing.push("Site address")
  if (!site?.pin) missing.push("PIN code")
  return missing
}

/** Rule-based demo qualification. Replace with the AI backend response when connected. */
export function summarizeLead(
  lead: Lead,
  customer?: Customer,
  site?: Site,
): AISummary {
  const missing = missingLeadFields(lead, customer, site)
  const kw =
    lead.preferredCapacity ?? recommendCapacity(lead.monthlyBill, lead.roofArea)
  const type = lead.systemType ?? "On-Grid"
  let score = 40
  if (lead.monthlyBill) score += lead.monthlyBill >= 2500 ? 25 : 12
  if (lead.roofArea) score += 10
  if (lead.systemType) score += 8
  if (site?.propertyType !== "Residential") score += 5
  score = Math.min(98, score - missing.length * 3)
  const bill = lead.monthlyBill
    ? `₹${lead.monthlyBill.toLocaleString("en-IN")}/month bill`
    : "bill not yet shared"
  const summary = `${site?.propertyType ?? "Residential"} prospect in ${site?.city ?? "unknown city"} with ${bill}. A ${kw} kW ${type} system is the likely fit${
    lead.roofArea ? ` for ~${lead.roofArea} sq ft of usable roof` : ""
  }. ${
    missing.length
      ? `Collect ${missing.length} missing detail${
          missing.length > 1 ? "s" : ""
        } before the survey.`
      : "Profile is complete — ready for a site survey."
  }`
  return {
    generatedAt: new Date().toISOString(),
    score,
    summary,
    recommendedCapacity: kw,
    recommendedType: type,
    missing,
    engine: "demo-rules",
  }
}

/* ---------- Inventory ---------- */

export function stockOf(db: DemoDB, productId: string) {
  const p = productOf(db, productId)
  const reserved = db.reservations
    .filter((r) => r.productId === productId)
    .reduce((s, r) => s + r.qty, 0)
  let onHand: number
  let dispatched: number
  if (p?.serialized) {
    const units = db.units.filter((u) => u.productId === productId)
    onHand = units.filter((u) => u.status === "In Stock").length
    dispatched = units.filter(
      (u) => u.status === "Dispatched" || u.status === "Installed",
    ).length
  } else {
    onHand = p?.onHand ?? 0
    dispatched = db.movements
      .filter((m) => m.productId === productId && m.type === "Dispatched")
      .reduce((s, m) => s + Math.abs(m.qty), 0)
  }
  return {
    onHand,
    reserved,
    available: onHand - reserved,
    dispatched,
    low: onHand - reserved <= (p?.reorderLevel ?? 0),
  }
}

export function inventoryValue(db: DemoDB) {
  return db.products.reduce(
    (sum, p) => sum + stockOf(db, p.id).onHand * p.unitCost,
    0,
  )
}

/** Stock check for a sales order, accounting for what is already reserved for it. */
export function orderStockCheck(db: DemoDB, salesOrderId: string) {
  const so = byId(db.salesOrders, salesOrderId)
  if (!so) return []
  return so.bom.map((line) => {
    const s = stockOf(db, line.productId)
    const mine = db.reservations
      .filter((r) => r.salesOrderId === so.id && r.productId === line.productId)
      .reduce((a, r) => a + r.qty, 0)
    const availableForMe = s.available + mine
    return {
      ...line,
      available: s.available,
      reservedForOrder: mine,
      shortage: Math.max(0, line.qty - availableForMe),
    }
  })
}

/* ---------- Warranty ---------- */

export type WarrantyState = "Active" | "Expiring Soon" | "Expired" | "Superseded"

export function warrantyState(w: Warranty, now = Date.now()): WarrantyState {
  if (w.supersededBy) return "Superseded"
  const end = new Date(w.end).getTime()
  if (end < now) return "Expired"
  if (end - now < 90 * DAY) return "Expiring Soon"
  return "Active"
}

export const currentWarrantyForSerial = (db: DemoDB, serial: string) =>
  db.warranties.find((w) => w.serial === serial && !w.supersededBy)

/* ---------- Money ---------- */

export const paidForOrder = (db: DemoDB, salesOrderId: string) =>
  db.payments
    .filter((p) => p.salesOrderId === salesOrderId)
    .reduce((s, p) => s + p.amount, 0)

export function projectFinancials(db: DemoDB, installationId: string) {
  const inst = byId(db.installations, installationId)
  const so = inst && byId(db.salesOrders, inst.salesOrderId)
  const invoiced = so?.total ?? 0
  const collected = so ? paidForOrder(db, so.id) : 0
  const dispatch = db.dispatches.find(
    (d) => d.installationId === installationId && d.status !== "Draft",
  )
  const equipmentLines = (dispatch?.lines ?? []).map((l) => {
    const p = productOf(db, l.productId)
    return {
      label: p?.name ?? l.productId,
      qty: l.qty,
      unitCost: p?.unitCost ?? 0,
      amount: l.qty * (p?.unitCost ?? 0),
    }
  })
  const equipmentCost = equipmentLines.reduce((s, l) => s + l.amount, 0)
  const hours = (inst?.timesheets ?? []).reduce(
    (s, t) =>
      s +
      ((t.end ? new Date(t.end).getTime() : Date.now()) -
        new Date(t.start).getTime()) /
        3600000,
    0,
  )
  const labourCost = Math.round(hours * db.settings.technicianHourlyCost)
  const tickets = db.serviceTickets.filter(
    (t) => t.installationId === installationId,
  )
  const serviceCost = tickets.reduce(
    (s, t) =>
      s +
      t.parts.reduce((a, p) => a + p.qty * p.unitCost, 0) +
      t.labourHours * db.settings.technicianHourlyCost,
    0,
  )
  const serviceRevenue = tickets.reduce(
    (s, t) => s + (t.status === "Closed" ? t.customerCharge : 0),
    0,
  )
  const logistics = inst?.logisticsCost ?? 0
  const totalCost = equipmentCost + labourCost + logistics + serviceCost
  const revenue = invoiced + serviceRevenue
  const contribution = revenue - totalCost
  return {
    invoiced,
    serviceRevenue,
    collected,
    outstanding: Math.max(0, invoiced - collected),
    equipmentLines,
    equipmentCost,
    labourHours: Math.round(hours * 10) / 10,
    labourCost,
    logistics,
    serviceCost,
    totalCost,
    contribution,
    marginPct: revenue ? Math.round((contribution / revenue) * 1000) / 10 : 0,
  }
}

/* ---------- Installation ---------- */

export const AUTO_CHECKLIST = ["serials", "photos", "signature"] as const

export function installationEvidence(db: DemoDB, inst: Installation) {
  const dispatch = db.dispatches.find(
    (d) => d.installationId === inst.id && d.status !== "Draft",
  )
  const expectedSerials = dispatch?.lines.flatMap((l) => l.serials) ?? []
  return {
    expectedSerials,
    serialsOk:
      expectedSerials.length > 0 &&
      expectedSerials.every((s) => inst.verifiedSerials.includes(s)),
    photosOk: inst.photos.length >= 2,
    signatureOk: !!inst.signature,
    testsOk: !!inst.tests,
    delivered: dispatch?.status === "Delivered",
  }
}

export function installationMissing(db: DemoDB, inst: Installation) {
  const ev = installationEvidence(db, inst)
  const missing: string[] = []
  for (const item of CHECKLIST_ITEMS) {
    if ((AUTO_CHECKLIST as readonly string[]).includes(item.key)) continue
    if (!inst.checklist[item.key]) missing.push(item.label)
  }
  if (!ev.testsOk) missing.push("Test results")
  if (!ev.serialsOk)
    missing.push(
      `Serial verification (${inst.verifiedSerials.filter((s) => ev.expectedSerials.includes(s)).length}/${ev.expectedSerials.length})`,
    )
  if (!ev.photosOk)
    missing.push(`Photographs (${inst.photos.length}/2 minimum)`)
  if (!ev.signatureOk) missing.push("Customer signature")
  return missing
}

export const isDelayed = (inst: Installation) =>
  inst.status !== "Completed" &&
  !!inst.expectedCompletion &&
  new Date(inst.expectedCompletion).getTime() < Date.now()

export const installationProgress = (inst: Installation) => {
  const done = CHECKLIST_ITEMS.filter((c) => inst.checklist[c.key]).length
  return Math.round((done / CHECKLIST_ITEMS.length) * 100)
}
