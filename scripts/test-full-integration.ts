import { getDb, resetDb } from "../src/data/store"
import { submitEnquiry } from "../src/services/crm"
import { calculateSolarEstimate, assistantService } from "../src/services/assistant"
import { queryDatabase } from "../src/services/dbLookup"
import { inr } from "../src/lib/format"
import type { Lead, Quotation, SalesOrder, Installation } from "../src/lib/types"

console.log("=======================================================")
console.log("   SUNFLOW 360 FULL SYSTEM INTEGRATION TEST SUITE     ")
console.log("=======================================================\n")

let passCount = 0
let failCount = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${msg}`)
    passCount++
  } else {
    console.error(`  ✗ FAIL: ${msg}`)
    failCount++
  }
}

// -------------------------------------------------------------
// MODULE 1: Database Hydration & Store Integrity
// -------------------------------------------------------------
console.log("--- Module 1: Store & Database Seeding ---")
const db = getDb()
assert(db.customers.length >= 40, `Loaded ${db.customers.length} customer records (>= 40)`)
assert(db.leads.length >= 40, `Loaded ${db.leads.length} leads (>= 40)`)
assert(db.products.length >= 8, `Loaded ${db.products.length} catalog products (>= 8)`)
assert(db.suppliers.length >= 4, `Loaded ${db.suppliers.length} approved Tier-1 suppliers (>= 4)`)
assert(db.users.length >= 6, `Loaded ${db.users.length} staff users across roles (>= 6)`)
assert(db.warranties.length >= 100, `Loaded ${db.warranties.length} hardware warranties (>= 100)`)

// -------------------------------------------------------------
// MODULE 2: End-to-End CRM Lead Submission
// -------------------------------------------------------------
console.log("\n--- Module 2: CRM Enquiry & Lead Pipeline ---")
const testPhone = "9988776655"
const enqResult = await submitEnquiry({
  name: "Rajesh Varma",
  phone: testPhone,
  language: "English",
  contactMethod: "Phone",
  propertyType: "Residential",
  address: "Flat 401, Sun City, Kothrud",
  city: "Pune",
  pin: "411038",
  monthlyBill: 4200,
  source: "Website",
})

assert(Boolean(enqResult.leadId), `New Lead generated with ID: ${enqResult.leadId}`)
assert(Boolean(enqResult.customerId), `Customer entity generated: ${enqResult.customerId}`)
const freshDb = getDb()
const createdLead = freshDb.leads.find((l) => l.id === enqResult.leadId)
assert(createdLead?.status === "New", `Lead initialized in 'New' status (got '${createdLead?.status}')`)
assert(createdLead?.monthlyBill === 4200, `Lead recorded monthly bill of ₹4,200 (got ${inr(createdLead?.monthlyBill)})`)

// Duplicate phone check: submitting same phone matches existing customer
const dupEnq = await submitEnquiry({
  name: "Rajesh Varma",
  phone: testPhone,
  language: "English",
  contactMethod: "WhatsApp",
  propertyType: "Residential",
  address: "Flat 401, Sun City, Kothrud",
  city: "Pune",
  pin: "411038",
  source: "AI Assistant",
})
assert(dupEnq.customerId === enqResult.customerId, `Existing customer matched by phone ${testPhone}`)

// -------------------------------------------------------------
// MODULE 3: Solar Estimation & PM Surya Ghar Subsidy Engine
// -------------------------------------------------------------
console.log("\n--- Module 3: Solar Sizing & PM Surya Ghar Subsidy ---")
const est1 = calculateSolarEstimate({ preferredCapacity: 1, systemType: "On-Grid" })
assert(est1.subsidy === 30000, `1 kW On-Grid subsidy is ₹30,000 (got ${inr(est1.subsidy)})`)
assert(est1.netCost === 35000, `1 kW On-Grid net cost is ₹35,000 (gross: ₹65,000)`)

const est2 = calculateSolarEstimate({ preferredCapacity: 2, systemType: "On-Grid" })
assert(est2.subsidy === 60000, `2 kW On-Grid subsidy is ₹60,000 (got ${inr(est2.subsidy)})`)
assert(est2.netCost === 65000, `2 kW On-Grid net cost is ₹65,000 (gross: ₹125,000)`)

const est3 = calculateSolarEstimate({ preferredCapacity: 3, systemType: "On-Grid" })
assert(est3.subsidy === 78000, `3 kW On-Grid subsidy is max ₹78,000 (got ${inr(est3.subsidy)})`)
assert(est3.netCost === 102000, `3 kW On-Grid net cost is ₹102,000 (gross: ₹180,000)`)
assert(est3.paybackYears <= 3.5, `3 kW Payback period is ${est3.paybackYears} years (<= 3.5 yrs)`)

const est5 = calculateSolarEstimate({ preferredCapacity: 5, systemType: "On-Grid" })
assert(est5.subsidy === 78000, `5 kW On-Grid subsidy is capped at ₹78,000 flat`)

const estOffGrid = calculateSolarEstimate({ preferredCapacity: 3, systemType: "Off-Grid" })
assert(estOffGrid.subsidy === 0, `Off-grid systems with battery have ₹0 PM Surya Ghar subsidy`)
assert(estOffGrid.grossCost === 245000, `3 kW Off-grid system gross cost is ₹245,000`)

// -------------------------------------------------------------
// MODULE 4: Chatbot Database Query Engine Lookups
// -------------------------------------------------------------
console.log("\n--- Module 4: Chatbot Database Lookups & Grounding ---")

// Customer phone lookup
const custQuery = queryDatabase("What is the status for phone 9822334455?")
assert(custQuery?.found === true, `Phone lookup matched record for Priya Deshmukh`)
assert(custQuery?.category === "customer", `Result categorized as 'customer'`)
assert(custQuery?.summary.includes("Priya Deshmukh") === true, `Summary includes customer name`)

// Customer name query
const nameQuery = queryDatabase("Check account for Priya Deshmukh")
assert(nameQuery?.found === true, `Customer name lookup found Priya Deshmukh`)

// Lead lookup
const leadQuery = queryDatabase("Check status of lead LD-0001")
assert(leadQuery?.found === true, `Found lead LD-0001`)
assert(leadQuery?.category === "lead", `Result categorized as 'lead'`)

// Quotation lookup
const quoteQuery = queryDatabase("Details for quotation QT-0001")
assert(quoteQuery?.found === true, `Found quotation QT-0001`)
assert(quoteQuery?.category === "quotation", `Result categorized as 'quotation'`)

// Sales Order lookup
const soQuery = queryDatabase("Track sales order SO-0001")
assert(soQuery?.found === true, `Found sales order SO-0001`)
assert(soQuery?.category === "order", `Result categorized as 'order'`)
assert(soQuery?.summary.includes("₹2,77,867") === true, `Order total ₹2,77,867 present in response`)

// Installation lookup
const instQuery = queryDatabase("Track installation SOL-2025-0001")
assert(instQuery?.found === true, `Found installation SOL-2025-0001`)
assert(instQuery?.category === "installation", `Result categorized as 'installation'`)

// Service ticket lookup
const tktQuery = queryDatabase("What is the diagnosis for ticket TKT-0001?")
assert(tktQuery?.found === true, `Found service ticket TKT-0001`)
assert(tktQuery?.summary.includes("hotspot") === true, `Ticket issue details accurately reported`)

// Serial number & warranty check
const serialQuery = queryDatabase("Verify serial PN540-100001")
assert(serialQuery?.found === true, `Verified panel serial PN540-100001`)
assert(serialQuery?.category === "warranty", `Categorized as 'warranty'`)

// Warehouse inventory & catalog lookup
const catQuery = queryDatabase("Show me solar panel pricing and wattage")
assert(catQuery?.found === true, `Matched solar panel catalog query`)
assert(catQuery?.summary.includes("540 Wp") === true, `Catalog reports 540 Wp Mono PERC`)

const invQuery = queryDatabase("How much inventory is in the warehouse?")
assert(invQuery?.found === true, `Matched warehouse inventory query`)

// Database summary stats
const statsQuery = queryDatabase("How many leads are in the database?")
assert(statsQuery?.found === true, `Database leads statistics returned`)

// -------------------------------------------------------------
// MODULE 5: Multilingual Conversational AI Greeting & Turns
// -------------------------------------------------------------
console.log("\n--- Module 5: Multilingual Assistant Turns ---")
const greeting = assistantService.greet()
assert(greeting.text.length > 20, `Assistant greeting generated: "${greeting.text.slice(0, 40)}..."`)
assert(greeting.quickReplies.length >= 3, `Greeting provides ${greeting.quickReplies.length} language choices`)

// -------------------------------------------------------------
// MODULE 6: Debounced Search & Invariant Verification
// -------------------------------------------------------------
console.log("\n--- Module 6: Data Invariants & Financial Consistency ---")

// Total payments check
let totalPaymentsValid = true
for (const so of db.salesOrders) {
  const pSum = db.payments
    .filter((p) => p.salesOrderId === so.id)
    .reduce((sum, p) => sum + p.amount, 0)
  if (pSum > so.total + 1) { // allow small float precision
    totalPaymentsValid = false
  }
}
assert(totalPaymentsValid, `Financial integrity: No sales order has recorded payments exceeding contract total`)

// Installation warranty link
let instWarrantiesValid = true
for (const inst of db.installations.filter((i) => i.status === "Completed")) {
  const warranties = db.warranties.filter((w) => w.installationId === inst.id)
  if (warranties.length === 0) {
    instWarrantiesValid = false
  }
}
assert(instWarrantiesValid, `Every completed installation has registered hardware warranties`)

console.log("\n=======================================================")
console.log(`FULL INTEGRATION RUN: ${passCount} PASSED, ${failCount} FAILED`)
console.log("=======================================================")

if (failCount > 0) {
  process.exit(1)
}
