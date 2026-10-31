import { getDb } from "@/data/store"
import { inr, normalizePhone } from "@/lib/format"
import type {
  Customer,
  DemoDB,
  Installation,
  Lead,
  Product,
  Quotation,
  SalesOrder,
  ServiceTicket,
  Site,
  Survey,
  Warranty,
} from "@/lib/types"

export interface DbLookupResult {
  found: boolean
  category: "customer" | "lead" | "survey" | "quotation" | "order" | "installation" | "ticket" | "warranty" | "product" | "pricing" | "team" | "none"
  title: string
  summary: string
  details?: Record<string, string | number | undefined>
  quickReplies?: string[]
}

/**
 * Normalizes an Indian phone number or text query for database matching
 */
function cleanPhone(raw: string): string {
  return raw.replace(/[\s-+]/g, "").slice(-10)
}

/**
 * Searches the local SunFlow 360 database (getDb()) for records matching user query.
 */
export function queryDatabase(queryText: string): DbLookupResult | null {
  const db = getDb()
  const text = queryText.trim()
  const lower = text.toLowerCase()

  // 1. Phone number lookup (10 digits starting with 6-9)
  const phoneMatch = text.replace(/[\s-+]/g, "").match(/[6-9]\d{9}/)
  if (phoneMatch) {
    const p = normalizePhone(phoneMatch[0])
    const customer = db.customers.find((c) => normalizePhone(c.phone) === p)
    if (customer) {
      return buildCustomerReport(db, customer)
    }
  }

  // 2. Ticket ID lookup (e.g. TKT-0001, TCK-0001)
  const ticketMatch = text.match(/\bT[CK]T-?\d{4}\b/i)
  if (ticketMatch) {
    const tId = ticketMatch[0].toUpperCase().replace("TCK", "TKT")
    const ticket = db.serviceTickets.find(
      (t) => t.id.toUpperCase() === tId || t.id.replace("-", "").toUpperCase() === tId.replace("-", ""),
    )
    if (ticket) {
      return buildTicketReport(db, ticket)
    }
  }

  // 3. Lead ID lookup (e.g. LD-0001, LED-2026-...)
  const leadMatch = text.match(/\b(?:LD|LED)[-_\s]?\d+[-\w]*\b/i)
  if (leadMatch) {
    const lId = leadMatch[0].toUpperCase()
    const lead = db.leads.find(
      (l) => l.id.toUpperCase() === lId || l.id.replace("-", "").toUpperCase() === lId.replace("-", ""),
    )
    if (lead) {
      return buildLeadReport(db, lead)
    }
  }

  // 4. Quotation ID lookup (e.g. QT-0001, QTN-0001)
  const quoteMatch = text.match(/\bQTN?[-_\s]?\d{4}\b/i)
  if (quoteMatch) {
    const qId = quoteMatch[0].toUpperCase().replace("QTN", "QT")
    const quote = db.quotations.find((q) => q.id.toUpperCase() === qId)
    if (quote) {
      return buildQuotationReport(db, quote)
    }
  }

  // 5. Sales Order ID lookup (e.g. SO-0001)
  const soMatch = text.match(/\bSO[-_\s]?\d{4}\b/i)
  if (soMatch) {
    const sId = soMatch[0].toUpperCase()
    const so = db.salesOrders.find((s) => s.id.toUpperCase() === sId)
    if (so) {
      return buildOrderReport(db, so)
    }
  }

  // 6. Installation ID lookup (e.g. INS-0001 or SOL-2025-0001)
  const instMatch = text.match(/\b(?:INS|SOL)[-_\s]?\d+[-\w]*\b/i)
  if (instMatch) {
    const iId = instMatch[0].toUpperCase()
    const inst = db.installations.find(
      (i) => i.id.toUpperCase() === iId || i.reference.toUpperCase() === iId,
    )
    if (inst) {
      return buildInstallationReport(db, inst)
    }
  }

  // 7. Serial number / Warranty lookup (e.g. PN540-100001, OG3K-100001, BT150-100001)
  const serialMatch = text.match(/\b(?:PN540|OG\dK|HY\dK|BT150|INV)[-_\s]?\w+\b/i)
  if (serialMatch) {
    const sNum = serialMatch[0].toUpperCase()
    const warranty = db.warranties.find((w) => w.serial.toUpperCase() === sNum)
    if (warranty) {
      return buildWarrantyReport(db, warranty)
    }
    const unit = db.units.find((u) => u.serial.toUpperCase() === sNum)
    if (unit) {
      const p = db.products.find((x) => x.id === unit.productId)
      return {
        found: true,
        category: "warranty",
        title: `Inventory Unit Serial: ${unit.serial}`,
        summary: `Found serial **${unit.serial}** (${p?.name ?? "Equipment"}). Status in database is **${unit.status}** linked to installation **${unit.installationId ?? "In Warehouse"}**.`,
        quickReplies: ["View Product Specs", "Book Service Request"],
      }
    }
  }

  // 8. Customer Name lookup
  for (const c of db.customers) {
    const cNameLower = c.name.toLowerCase()
    if (lower.includes(cNameLower) && cNameLower.length >= 4) {
      return buildCustomerReport(db, c)
    }
  }

  // 9. Database Counts, Statistics & General Overview
  if (/database|stats|summary|overview|records|how many/i.test(lower)) {
    if (/lead/i.test(lower)) {
      const total = db.leads.length
      const won = db.leads.filter((l) => l.status === "Won").length
      const open = db.leads.filter((l) => !["Won", "Lost"].includes(l.status)).length
      return {
        found: true,
        category: "lead",
        title: "Database Leads Summary",
        summary: `Our database currently tracks **${total} total leads**:\n- **Active In Pipeline**: ${open} leads\n- **Won / Converted**: ${won} leads\n- **Lost / Dropped**: ${total - open - won} leads\n\nYou can query any lead directly by ID (e.g. \`LD-0001\`) or by customer mobile number.`,
        quickReplies: ["Track Lead LD-0001", "Database Overview", "Book Free Site Survey"],
      }
    }
    if (/order/i.test(lower)) {
      const total = db.salesOrders.length
      const installed = db.salesOrders.filter((s) => s.status === "Installed" || s.status === "Closed").length
      const totalValue = db.salesOrders.reduce((sum, s) => sum + s.total, 0)
      return {
        found: true,
        category: "order",
        title: "Sales Orders Summary",
        summary: `Our database records **${total} sales orders** valued at **${inr(totalValue)}**:\n- **Completed / Installed**: ${installed}\n- **In Progress / Dispatched**: ${total - installed}\n\nYou can query any order directly by reference (e.g. \`SO-0001\`).`,
        quickReplies: ["Track Order SO-0001", "Database Overview"],
      }
    }
    if (/install/i.test(lower)) {
      const total = db.installations.length
      const done = db.installations.filter((i) => i.status === "Completed").length
      return {
        found: true,
        category: "installation",
        title: "Installations Summary",
        summary: `Our database tracks **${total} total installations** across Maharashtra & India:\n- **Commissioned & Completed**: ${done}\n- **In Progress / Scheduled**: ${total - done}\n\nYou can query any installation by reference (e.g. \`SOL-2026-0001\` or \`INS-0001\`).`,
        quickReplies: ["Track Installation INS-0001", "Database Overview"],
      }
    }
    if (/ticket/i.test(lower)) {
      const total = db.serviceTickets.length
      const open = db.serviceTickets.filter((t) => t.status !== "Closed").length
      return {
        found: true,
        category: "ticket",
        title: "Service Tickets Summary",
        summary: `Our database has **${total} service tickets** recorded:\n- **Active / In Repair / Diagnosed**: ${open}\n- **Closed & Resolved**: ${total - open}\n\nYou can check any ticket by ID (e.g. \`TKT-0001\`, \`TKT-0002\`).`,
        quickReplies: ["Status of TKT-0001", "Status of TKT-0002"],
      }
    }
    // Overall database overview
    return {
      found: true,
      category: "pricing",
      title: "SunFlow 360 Database Overview",
      summary: `Here is the current snapshot of our live system database:\n- **Registered Customers**: ${db.customers.length}\n- **Active & Historical Leads**: ${db.leads.length}\n- **Site Surveys**: ${db.surveys.length}\n- **Quotations Created**: ${db.quotations.length}\n- **Sales Orders**: ${db.salesOrders.length}\n- **Solar Installations**: ${db.installations.length}\n- **Service Tickets**: ${db.serviceTickets.length}\n- **Equipment Warranties**: ${db.warranties.length}\n- **Catalog Products**: ${db.products.length} models\n- **Inventory Serialized Units**: ${db.units.length}\n\nYou can query any customer by name or phone, any order/lead/ticket by reference, or ask about product pricing!`,
      quickReplies: ["View Product Catalog", "Check Lead LD-0001", "Check Ticket TKT-0001"],
    }
  }

  // 10. Suppliers & Vendors
  if (/supplier|vendor|who supplies/i.test(lower)) {
    const list = db.suppliers
      .map(
        (s) =>
          `- **${s.name}** (${s.city}): Supplies ${s.categories.join(", ")} (Lead time: ${s.leadTimeDays} days)`,
      )
      .join("\n")
    return {
      found: true,
      category: "team",
      title: "Approved Equipment Suppliers",
      summary: `Our database lists **${db.suppliers.length} Tier-1 certified solar equipment suppliers**:\n\n${list}`,
      quickReplies: ["Solar Panel Specs", "Inverter Details", "Database Overview"],
    }
  }

  // 11. Warehouse & Inventory queries
  if (/inventory|warehouse|stock on hand|stock level/i.test(lower)) {
    const panels = db.products.find((p) => p.category === "Panel")
    const inverters = db.products.filter((p) => p.category === "Inverter")
    const batteries = db.products.find((p) => p.category === "Battery")
    const serializedInStock = db.units.filter((u) => u.status === "In Stock").length

    return {
      found: true,
      category: "product",
      title: "SunFlow Warehouse Inventory Status",
      summary: `Live inventory status in our warehouse database:\n- **Solar Panels**: ${panels?.name} — **${panels?.onHand ?? 0} units** on hand\n- **Inverters**: ${inverters.map((i) => i.name).join(", ")}\n- **Batteries**: ${batteries?.name ?? "Tubular 150Ah"} — **${batteries?.onHand ?? 0} units** on hand\n- **Total Serialized Equipment in Stock**: **${serializedInStock} units** ready for dispatch.`,
      quickReplies: ["Panel Pricing", "Inverter Details", "Database Overview"],
    }
  }

  // 9. Product catalog & specs queries
  if (
    /panel|module|inverter|battery|structure|cable|wire|earthing|lightning|product|catalog|stock/i.test(
      lower,
    )
  ) {
    if (/panel|module/i.test(lower)) {
      const p = db.products.find((x) => x.category === "Panel")
      if (p) {
        return {
          found: true,
          category: "product",
          title: `Solar Panel: ${p.name}`,
          summary: `Our database catalog specifies **${p.name}**:\n- **Rated Wattage**: 540 Wp Mono PERC (21.4% cell efficiency)\n- **Turnkey Price**: ${inr(p.unitPrice)} per panel\n- **Warranty Terms**: ${p.warrantyTerms} (25-year performance warranty)\n- **Stock on Hand**: ${p.onHand} units in warehouse`,
          quickReplies: ["Cost for 3kW System", "Inverter Details", "Book Site Survey"],
        }
      }
    }

    if (/inverter/i.test(lower)) {
      const inverters = db.products.filter((x) => x.category === "Inverter")
      const listStr = inverters
        .slice(0, 4)
        .map((inv) => `- **${inv.name}**: ${inr(inv.unitPrice)} (${inv.warrantyTerms})`)
        .join("\n")
      return {
        found: true,
        category: "product",
        title: "Inverter Catalog & Database Prices",
        summary: `Here are the solar inverters recorded in our database:\n\n${listStr}\n\nAll string inverters include IP65 weatherproof casing, dual MPPT tracking, and WiFi app monitoring!`,
        quickReplies: ["On-Grid vs Off-Grid", "Panel Details", "Estimate My Bill"],
      }
    }

    if (/battery|tubular/i.test(lower)) {
      const bat = db.products.find((x) => x.category === "Battery")
      if (bat) {
        return {
          found: true,
          category: "product",
          title: `Battery Storage: ${bat.name}`,
          summary: `Our database specifies **${bat.name}**:\n- **Capacity**: 150 Ah C10 Solar Deep-Cycle Tubular Battery\n- **Catalog Price**: ${inr(bat.unitPrice)} per unit\n- **Warranty**: ${bat.warrantyTerms}\n- **Application**: Used in Off-Grid & Hybrid PCU installations for evening power backup.`,
          quickReplies: ["Off-Grid System Cost", "On-Grid vs Off-Grid"],
        }
      }
    }
  }

  // 10. Pricing settings queries
  if (/labor|labour|service fee|transport|net metering fee|rate/i.test(lower)) {
    const s = db.settings
    return {
      found: true,
      category: "pricing",
      title: "SunFlow 360 Standard Cost & Fee Structure",
      summary: `According to our system pricing settings:\n- **Installation Labour**: ${inr(s.labourPerKw)} per kW\n- **Net Metering Liaisoning Fee**: ${inr(s.netMeteringFee)} (Includes Discom sanction, inspection, meter testing)\n- **Transport & Logistics Fee**: ${inr(s.transportFee)}\n- **Advance Required for Order Booking**: ${s.advancePct}%\n- **Technician Service Rate**: ${inr(s.technicianHourlyCost)}/hr (after-sales service)`,
      quickReplies: ["Estimate Total System Cost", "Book Free Site Survey"],
    }
  }

  // 11. Team / Staff queries
  if (/team|staff|director|engineer|surveyor|who is/i.test(lower)) {
    const director = db.users.find((u) => u.role === "admin")
    const sales = db.users.filter((u) => u.role === "sales")
    const surveyors = db.users.filter((u) => u.role === "surveyor")
    return {
      found: true,
      category: "team",
      title: "SunFlow 360 Core Team",
      summary: `Our engineering and management team in the database:\n- **Leadership**: ${director?.name} (${director?.title})\n- **Sales & Customer Advisory**: ${sales.map((s) => s.name).join(", ")}\n- **Technical Site Surveyors**: ${surveyors.map((s) => s.name).join(", ")}\n- **Total Certified Personnel**: ${db.users.length} professionals across Maharashtra & regional hubs.`,
      quickReplies: ["Talk to an Advisor", "Book Free Site Survey"],
    }
  }

  return null
}

/* =========================================================================
   REPORT BUILDERS
   ========================================================================= */

function buildCustomerReport(db: DemoDB, c: Customer): DbLookupResult {
  const site = db.sites.find((s) => s.customerId === c.id)
  const lead = db.leads.find((l) => l.customerId === c.id)
  const quotes = db.quotations.filter((q) => q.customerId === c.id)
  const so = db.salesOrders.find((s) => s.customerId === c.id)
  const inst = db.installations.find((i) => i.customerId === c.id)
  const tickets = db.serviceTickets.filter((t) => t.customerId === c.id)

  let summary = `Found customer record for **${c.name}** in our database:\n- **Registered Mobile**: ${c.phone}\n- **Site Location**: ${site?.address ? `${site.address}, ` : ""}${site?.city ?? "Pune"}, ${site?.state ?? "Maharashtra"}\n- **Property Type**: ${site?.propertyType ?? "Residential"}\n`

  if (lead) {
    summary += `- **Active Lead Ref**: \`${lead.id}\` | **Status**: **${lead.status}**\n- **System Size**: ${lead.preferredCapacity ?? 3} kW (${lead.systemType ?? "On-Grid"})\n`
  }

  if (inst) {
    summary += `- **Installation Ref**: \`${inst.reference}\` | **Stage**: **${inst.status}**\n`
  } else if (so) {
    summary += `- **Sales Order Ref**: \`${so.id}\` | **Status**: **${so.status}** (Value: ${inr(so.total)})\n`
  } else if (quotes.length > 0) {
    const q = quotes[0]
    summary += `- **Quotation Ref**: \`${q.id}\` | **Total**: ${inr(q.totals.total)} | **Status**: ${q.status}\n`
  }

  if (tickets.length > 0) {
    const t = tickets[0]
    summary += `- **Recent Service Ticket**: \`${t.id}\` (${t.status} - "${t.issue}")\n`
  }

  return {
    found: true,
    category: "customer",
    title: `Customer Record: ${c.name}`,
    summary: summary.trim(),
    quickReplies: [
      "Track My Installation",
      "Check Warranty Details",
      "Talk to My Assigned Advisor",
    ],
  }
}

function buildTicketReport(db: DemoDB, t: ServiceTicket): DbLookupResult {
  const c = db.customers.find((x) => x.id === t.customerId)
  const inst = db.installations.find((i) => i.id === t.installationId)
  const tech = db.users.find((u) => u.id === t.assignedTo)

  const summary = `**Service Ticket \`${t.id}\` Status Report:**\n- **Customer**: ${c?.name ?? "Customer"}\n- **Status**: **${t.status}** (Priority: ${t.priority})\n- **Reported Issue**: "${t.issue}"\n- **Diagnosis**: ${t.diagnosis ?? "Inspection scheduled"}\n- **Assigned Technician**: ${tech?.name ?? "Field Engineering Team"}\n- **Warranty Coverage**: ${t.coverage ?? "Under Review"}${t.customerCharge ? `\n- **Customer Estimate / Charge**: ${inr(t.customerCharge)}` : ""}\n- **Created Date**: ${new Date(t.createdAt).toLocaleDateString("en-IN")}`

  return {
    found: true,
    category: "ticket",
    title: `Service Ticket ${t.id}`,
    summary,
    quickReplies: ["Talk to Technician", "Check Warranty", "Book Site Survey"],
  }
}

function buildLeadReport(db: DemoDB, lead: Lead): DbLookupResult {
  const c = db.customers.find((x) => x.id === lead.customerId)
  const site = db.sites.find((s) => s.id === lead.siteId)
  const sales = db.users.find((u) => u.id === lead.assignedTo)
  const survey = db.surveys.find((s) => s.leadId === lead.id)

  const summary = `**Lead Record \`${lead.id}\` in SunFlow Database:**\n- **Customer**: ${c?.name ?? "Customer"} (${c?.phone ?? "—"})\n- **Location**: ${site?.city ?? "Pune"}, ${site?.propertyType ?? "Residential"}\n- **Current Status**: **${lead.status}**\n- **Recommended System**: ${lead.preferredCapacity ?? 3} kW ${lead.systemType ?? "On-Grid"}\n- **Assigned Sales Advisor**: ${sales?.name ?? "SunFlow Sales Desk"}\n${survey ? `- **Linked Survey**: \`${survey.id}\` (Status: ${survey.status})` : ""}`

  return {
    found: true,
    category: "lead",
    title: `Lead ${lead.id}`,
    summary,
    quickReplies: ["Schedule Site Survey", "View Quotation", "Talk to Advisor"],
  }
}

function buildQuotationReport(db: DemoDB, q: Quotation): DbLookupResult {
  const c = db.customers.find((x) => x.id === q.customerId)

  const summary = `**Quotation \`${q.id}\` Details:**\n- **Customer**: ${c?.name ?? "Customer"}\n- **System Size**: ${q.capacity} kW ${q.systemType}\n- **Gross Turnkey Total**: ${inr(q.totals.total)}\n- **Required Advance (30%)**: ${inr(q.totals.advance)}\n- **Balance Payable**: ${inr(q.totals.balance)}\n- **Quotation Status**: **${q.status}** (Valid until: ${new Date(q.validUntil).toLocaleDateString("en-IN")})`

  return {
    found: true,
    category: "quotation",
    title: `Quotation ${q.id}`,
    summary,
    quickReplies: ["Proceed to Order", "Book Site Survey", "Talk to Advisor"],
  }
}

function buildOrderReport(db: DemoDB, so: SalesOrder): DbLookupResult {
  const c = db.customers.find((x) => x.id === so.customerId)
  const inst = db.installations.find((i) => i.salesOrderId === so.id)
  const paidAmount = db.payments
    .filter((p) => p.salesOrderId === so.id)
    .reduce((s, p) => s + p.amount, 0)

  const summary = `**Sales Order \`${so.id}\` Status:**\n- **Customer**: ${c?.name ?? "Customer"}\n- **Order Value**: ${inr(so.total)}\n- **Paid Amount**: ${inr(paidAmount)}\n- **Order Status**: **${so.status}**\n${inst ? `- **Installation Reference**: \`${inst.reference}\` (${inst.status})` : ""}`

  return {
    found: true,
    category: "order",
    title: `Sales Order ${so.id}`,
    summary,
    quickReplies: ["Track Installation", "Talk to Project Manager"],
  }
}

function buildInstallationReport(db: DemoDB, inst: Installation): DbLookupResult {
  const c = db.customers.find((x) => x.id === inst.customerId)
  const site = db.sites.find((s) => s.id === inst.siteId)
  const crew = db.users
    .filter((u) => inst.crew.some((tc) => tc.technicianId === u.id))
    .map((u) => u.name)

  const summary = `**Installation Project \`${inst.reference}\`:**\n- **Customer**: ${c?.name ?? "Customer"}\n- **Site**: ${site?.city ?? "Pune"}, ${site?.propertyType ?? "Residential"}\n- **System**: ${inst.capacity} kW ${inst.systemType}\n- **Current Project Stage**: **${inst.status}**\n- **Assigned Field Crew**: ${crew.length > 0 ? crew.join(", ") : "Crew to be scheduled"}\n- **Verified Hardware Serials**: ${inst.verifiedSerials.length} components registered`

  return {
    found: true,
    category: "installation",
    title: `Installation ${inst.reference}`,
    summary,
    quickReplies: ["Check Serial Numbers", "Check Warranty", "Talk to Advisor"],
  }
}

function buildWarrantyReport(db: DemoDB, w: Warranty): DbLookupResult {
  const p = w.productId === "WORKMANSHIP" ? null : db.products.find((x) => x.id === w.productId)
  const c = db.customers.find((x) => x.id === w.customerId)
  const inst = db.installations.find((i) => i.id === w.installationId)
  const isExpired = new Date(w.end).getTime() < Date.now()
  const status = w.supersededBy ? "Superseded" : isExpired ? "Expired" : "Active"
  const productName =
    w.productId === "WORKMANSHIP"
      ? "Workmanship & Installation Guarantee"
      : (p?.name ?? "Solar Equipment")

  const summary = `**Hardware Warranty Record for Serial \`${w.serial}\`:**\n- **Product**: ${productName}\n- **Registered Customer**: ${c?.name ?? "Customer"}\n- **Installation Ref**: ${inst?.reference ?? w.installationId}\n- **Warranty Status**: **${status}**\n- **Coverage Valid Until**: ${new Date(w.end).toLocaleDateString("en-IN")}\n- **Terms**: ${w.terms}`

  return {
    found: true,
    category: "warranty",
    title: `Warranty for Serial ${w.serial}`,
    summary,
    quickReplies: ["Check Service Ticket", "Book Maintenance Visit"],
  }
}

/**
 * Builds a structured database context summary to inject into Google Gemini prompt
 */
export function getDatabaseContextForGemini(userQuery: string): string {
  const db = getDb()
  const lookup = queryDatabase(userQuery)

  let context = `=== SUNFLOW 360 LIVE DATABASE CONTEXT ===\n`
  context += `Live Database Snapshot:\n`
  context += `- Customers: ${db.customers.length} registered customers\n`
  context += `- Leads: ${db.leads.length} total leads\n`
  context += `- Site Surveys: ${db.surveys.length} surveys\n`
  context += `- Quotations: ${db.quotations.length} quotations\n`
  context += `- Sales Orders: ${db.salesOrders.length} orders\n`
  context += `- Installations: ${db.installations.length} rooftop installations\n`
  context += `- Service Tickets: ${db.serviceTickets.length} tickets\n`
  context += `- Registered Warranties: ${db.warranties.length} hardware warranties\n`
  context += `- Suppliers: ${db.suppliers.length} approved Tier-1 suppliers\n\n`

  context += `Catalog Hardware & Turnkey Pricing:\n`
  db.products.slice(0, 8).forEach((p) => {
    context += `- ${p.name} (${p.category}): Turnkey Price ${inr(p.unitPrice)}, Warranty: ${p.warrantyTerms}, Stock on hand: ${p.onHand} units\n`
  })
  context += `\nStandard Operational Fees:\n`
  context += `- Labour: ${inr(db.settings.labourPerKw)}/kW\n`
  context += `- Discom Net Metering Liaisoning: ${inr(db.settings.netMeteringFee)}\n`
  context += `- Transport: ${inr(db.settings.transportFee)}\n`
  context += `- Advance Required: ${db.settings.advancePct}%\n`

  if (lookup && lookup.found) {
    context += `\n>>> SPECIFIC DATABASE RECORD MATCHED FOR USER QUERY:\n`
    context += `${lookup.summary}\n<<< END MATCHED RECORD\n`
  }

  context += `=== END DATABASE CONTEXT ===`
  return context
}
