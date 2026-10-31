import { getDb } from "../src/data/store"

import {
  queryDatabase,
  getDatabaseContextForGemini,
} from "../src/services/dbLookup"

console.log("=== TESTING DATABASE CHATBOT LOOKUPS ===")

const db = getDb()

console.log(
  `Database loaded: ${db.customers.length} customers, ${db.leads.length} leads, ${db.salesOrders.length} orders, ${db.installations.length} installations, ${db.serviceTickets.length} tickets`,
)

// 1. Test Customer lookup by phone

const firstCust = db.customers[0]

console.log(
  `\nTesting customer phone lookup for ${firstCust.name} (${firstCust.phone}):`,
)

const custRes = queryDatabase(`Lookup phone ${firstCust.phone}`)

console.log("Result found:", custRes?.found)

console.log("Result summary:\n", custRes?.summary)

// 2. Test Lead lookup

console.log(`\nTesting lead lookup for LD-0001:`)

const leadRes = queryDatabase(`What is the status of LD-0001?`)

console.log("Result found:", leadRes?.found)

console.log("Result summary:\n", leadRes?.summary)

// 3. Test Sales Order lookup

console.log(`\nTesting sales order lookup for SO-0001:`)

const orderRes = queryDatabase(`Can you check SO-0001?`)

console.log("Result found:", orderRes?.found)

console.log("Result summary:\n", orderRes?.summary)

// 4. Test Installation lookup

console.log(`\nTesting installation lookup:`)

const firstInst = db.installations[0]

const instRes = queryDatabase(`Track installation ${firstInst.reference}`)

console.log("Result found:", instRes?.found)

console.log("Result summary:\n", instRes?.summary)

// 5. Test Service Ticket lookup

console.log(`\nTesting service ticket lookup for TKT-0001:`)

const ticketRes = queryDatabase(`What is the status of TKT-0001?`)

console.log("Result found:", ticketRes?.found)

console.log("Result summary:\n", ticketRes?.summary)

// 6. Test Serial / Warranty lookup

console.log(`\nTesting serial number warranty lookup:`)

const firstWarranty = db.warranties[0]

if (firstWarranty) {
  const warRes = queryDatabase(`Verify serial ${firstWarranty.serial}`)

  console.log("Result found:", warRes?.found)

  console.log("Result summary:\n", warRes?.summary)
}

// 7. Test Catalog product inquiry

console.log(`\nTesting catalog product inquiry:`)

const prodRes = queryDatabase(`What solar panels do you have?`)

console.log("Result found:", prodRes?.found)

console.log("Result summary:\n", prodRes?.summary)

// 8. Test Database Overview / Stats

console.log(`\nTesting database overview inquiry:`)

const statsRes = queryDatabase(`How many leads are in the database?`)

console.log("Result found:", statsRes?.found)

console.log("Result summary:\n", statsRes?.summary)

// 9. Test Gemini Database Context injection

console.log(`\nTesting Gemini Context Generator:`)

const geminiContext = getDatabaseContextForGemini("Check my order SO-0001")

console.log(geminiContext.slice(0, 400) + "...\n(truncated)")

console.log("\n=== ALL LOOKUP TESTS COMPLETED SUCCESSFULLY ===")
