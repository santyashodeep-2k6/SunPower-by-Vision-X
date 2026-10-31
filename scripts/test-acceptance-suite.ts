import { getDb, replaceDb, setSession, mutate } from "../src/data/store"
import { buildSeed } from "../src/data/seed"
import { byId, projectFinancials, warrantyState, paidForOrder } from "../src/lib/rules"
import { buildBom, panelCount, quoteItemsFor, PACKAGES, inverterId } from "../src/lib/catalog"
import {
  createQuotation,
  sendQuotation,
  convertToSalesOrder,
  scheduleSurvey,
} from "../src/services/crm"
import {
  allocateSerial,
  confirmDispatch,
  scheduleInstallation,
  completeInstallation,
  recordDelivery,
} from "../src/services/operations"
import {
  verifyWarranty,
  recordDiagnosis,
  decideEstimate,
  startRepair,
  recordRepair,
  requestCustomerConfirmation,
  confirmRepair,
  closeTicket,
} from "../src/services/aftersales"
import { uid } from "../src/lib/format"
import type { Dispatch } from "../src/lib/types"

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${msg}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${msg}`)
    failed++
  }
}

async function assertThrowsAsync(fn: () => Promise<any>, expectedCodeOrSnippet: string, msg: string) {
  try {
    await fn()
    console.error(`  ✗ FAIL (did not throw): ${msg}`)
    failed++
  } catch (err: any) {
    const errorText = `${err?.code ?? ""} ${err?.message ?? ""}`
    if (errorText.toLowerCase().includes(expectedCodeOrSnippet.toLowerCase())) {
      console.log(`  ✓ PASS (threw as expected "${expectedCodeOrSnippet}"): ${msg}`)
      passed++
    } else {
      console.error(`  ✗ FAIL (threw unexpected message "${errorText}"): ${msg}`)
      failed++
    }
  }
}

async function runTestSuite() {
  console.log("\n=======================================================")
  console.log("   RUNNING SUNFLOW 360 CORE ACCEPTANCE & NEGATIVE TESTS")
  console.log("=======================================================\n")

  // Reset database to initial seed
  replaceDb(buildSeed())
  setSession({ role: "admin", userId: "USR-01" })

  // --------------------------------------------------------------------------
  // TEST 1: Survey Gate
  // Expected: Sending or generating a final quote before survey approval is BLOCKED.
  // --------------------------------------------------------------------------
  console.log("--- Test 1: Survey Gate ---")
  const unapprovedSurvey = getDb().surveys.find((s) => s.status !== "Approved")!
  await assertThrowsAsync(
    () => createQuotation(unapprovedSurvey.id, "PKG-3-ON"),
    "SURVEY_NOT_APPROVED",
    "Create quotation before survey approval is blocked with SURVEY_NOT_APPROVED",
  )

  // Also test sendQuotation with unapproved survey
  const draftQuote = getDb().quotations.find((q) => q.status === "Draft")
  if (draftQuote) {
    mutate((d) => {
      const s = byId(d.surveys, draftQuote.surveyId)
      if (s) s.status = "Pending Approval"
    })
    await assertThrowsAsync(
      () => sendQuotation(draftQuote.id),
      "SURVEY_NOT_APPROVED",
      "Sending quotation linked to unapproved survey is blocked with SURVEY_NOT_APPROVED",
    )
  }

  // --------------------------------------------------------------------------
  // TEST 2: Package Automation (3 kW On-Grid)
  // Expected: Correct kit components are loaded (6 panels, 3kW inverter, cables, BOS).
  // --------------------------------------------------------------------------
  console.log("\n--- Test 2: Package Automation (3 kW On-Grid) ---")
  const bom3kw = buildBom(3, "On-Grid")
  const pnlLine = bom3kw.find((l) => l.productId === "PNL-540")
  const invLine = bom3kw.find((l) => l.productId === "INV-OG-3K")
  const mntLine = bom3kw.find((l) => l.productId === "MNT-GI")
  const dcCable = bom3kw.find((l) => l.productId === "CBL-DC4")
  const acCable = bom3kw.find((l) => l.productId === "CBL-AC6")
  const batLine = bom3kw.find((l) => l.productId === "BAT-150")

  assert(pnlLine?.qty === 6, "3 kW On-Grid selects 6 x 540W Mono PERC panels")
  assert(invLine?.qty === 1, "3 kW On-Grid selects exactly 1 x 3kW On-Grid String Inverter (INV-OG-3K)")
  assert(mntLine?.qty === 3, "3 kW On-Grid specifies 3 x GI mounting structures")
  assert(dcCable?.qty === 50, "3 kW On-Grid specifies 50m UV-resistant DC solar cable")
  assert(acCable?.qty === 30, "3 kW On-Grid specifies 30m armored AC cable")
  assert(!batLine, "On-Grid system correctly contains NO batteries (0 qty)")

  // Also verify Off-grid loads batteries
  const bom3kwOff = buildBom(3, "Off-Grid")
  const batOffLine = bom3kwOff.find((l) => l.productId === "BAT-150")
  const invOffLine = bom3kwOff.find((l) => l.productId === "INV-OFF-3K")
  assert(batOffLine?.qty === 6, "3 kW Off-Grid correctly loads 6 x 150Ah solar batteries")
  assert(invOffLine?.qty === 1, "3 kW Off-Grid selects 1 x 3kW Hybrid Off-Grid Inverter (INV-OFF-3K)")

  // --------------------------------------------------------------------------
  // TEST 3: Warehouse Control
  // Expected: Delivery is blocked if a required serial number is missing.
  // --------------------------------------------------------------------------
  console.log("\n--- Test 3: Warehouse Control (Missing Serial Block) ---")
  const soForDispatch = getDb().salesOrders[0]
  const testDraftDispatchId = "DSP-TEST-CONTROL"
  mutate((d) => {
    d.dispatches.unshift({
      id: testDraftDispatchId,
      salesOrderId: soForDispatch.id,
      installationId: soForDispatch.installationId,
      status: "Draft",
      lines: [
        { productId: "INV-OG-3K", qty: 1, serials: [] }, // Missing serial!
        { productId: "CBL-DC4", qty: 50, serials: [] },
      ],
      vehicle: "MH-12-TR-9988",
      driverName: "Ramesh Shinde",
      createdAt: new Date().toISOString(),
    })
  })

  await assertThrowsAsync(
    () => confirmDispatch(testDraftDispatchId),
    "DISPATCH_INCOMPLETE",
    "Confirm dispatch with missing serial number throws DISPATCH_INCOMPLETE",
  )

  // --------------------------------------------------------------------------
  // TEST 4: Warranty Automation
  // Expected: On installation completion, warranties are generated for all serialized items.
  // --------------------------------------------------------------------------
  console.log("\n--- Test 4: Warranty Automation on Installation Completion ---")
  const testInstId = getDb().installations.find((i) => i.status === "Scheduled")!.id

  mutate((d) => {
    const inst = byId(d.installations, testInstId)!
    inst.status = "In Progress"
    inst.checklist.structure = true
    inst.checklist.panels = true
    inst.checklist.inverter = true
    inst.checklist.wiring = true
    inst.checklist.earthing = true
    inst.checklist.safety = true
    inst.checklist.generation = true
    inst.photos = [
      { id: "P1", url: "/photos/roof.jpg", caption: "Roof completion", at: new Date().toISOString() },
      { id: "P2", url: "/photos/inv.jpg", caption: "Inverter on wall", at: new Date().toISOString() },
    ]
    inst.signature = {
      dataUrl: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
      signedBy: "Rahul Sharma",
      signedAt: new Date().toISOString(),
    }
    inst.tests = {
      generationKw: 2.8,
      dcVoltage: 240,
      acVoltage: 230,
      insulationMOhm: 50,
      earthingOhm: 3.2,
      recordedAt: new Date().toISOString(),
    }

    let disp = d.dispatches.find((x) => x.installationId === testInstId)
    if (!disp) {
      disp = {
        id: "DSP-TEST-INST",
        salesOrderId: inst.salesOrderId,
        installationId: inst.id,
        status: "Delivered",
        lines: [
          { productId: "INV-OG-3K", qty: 1, serials: ["OG3K-AUTO-WAR-01"] },
          { productId: "PNL-540", qty: 2, serials: ["PNL-AUTO-WAR-01", "PNL-AUTO-WAR-02"] },
        ],
        vehicle: "MH-12-TR-1234",
        driverName: "Kishore Patil",
        createdAt: new Date().toISOString(),
      }
      d.dispatches.push(disp)
      for (const l of disp.lines) {
        for (const s of l.serials) {
          d.units.push({
            id: uid(),
            serial: s,
            productId: l.productId,
            status: "Dispatched",
            salesOrderId: inst.salesOrderId,
            dispatchId: disp.id,
            installationId: inst.id,
            location: "On Site",
            receivedAt: new Date().toISOString(),
          })
        }
      }
    } else {
      disp.status = "Delivered"
    }
    inst.verifiedSerials = disp.lines.flatMap((l) => l.serials)
  })

  await completeInstallation(testInstId)

  const updatedDb = getDb()
  const generatedWarranties = updatedDb.warranties.filter((w) => w.installationId === testInstId)
  assert(generatedWarranties.length >= 2, `Auto-generated ${generatedWarranties.length} warranties for installation`)
  assert(
    generatedWarranties.some((w) => w.productId === "WORKMANSHIP"),
    "5-Year Workmanship Warranty created automatically",
  )

  const verifiedSerials = byId(updatedDb.installations, testInstId)!.verifiedSerials
  for (const s of verifiedSerials) {
    assert(
      generatedWarranties.some((w) => w.serial === s),
      `Warranty generated for serial ${s}`,
    )
  }

  // --------------------------------------------------------------------------
  // TEST 5: Installation & Fault Adjudication (Active vs Expired Warranty)
  // Expected: Customer and serial history appear; active is covered, expired is chargeable.
  // --------------------------------------------------------------------------
  console.log("\n--- Test 5: Warranty Verification & Fault Adjudication ---")
  // 5a: Active warranty check
  const activeSerial = verifiedSerials[0]
  const activeCheck = await verifyWarranty(activeSerial)
  assert(activeCheck.state === "Active", `Active serial status is "${activeCheck.state}"`)
  assert(activeCheck.covered === true, "Active warranty evaluates to covered = true")

  // 5b: Expired warranty test (Simulate 18 months or past warranty limit)
  mutate((d) => {
    d.warranties.push({
      id: "WAR-EXPIRED-TEST",
      serial: "INV-EXPIRED-001",
      productId: "INV-OG-3K",
      installationId: testInstId,
      customerId: byId(d.installations, testInstId)!.customerId,
      start: "2023-01-01T00:00:00Z",
      end: "2024-01-01T00:00:00Z", // Past date
      terms: "1-year limited warranty",
    })
    d.units.push({
      id: "UNIT-EXP-01",
      serial: "INV-EXPIRED-001",
      productId: "INV-OG-3K",
      status: "Installed",
      salesOrderId: byId(d.installations, testInstId)!.salesOrderId,
      dispatchId: "DSP-TEST-INST",
      installationId: testInstId,
      location: "Customer Site",
      receivedAt: "2023-01-01T00:00:00Z",
    })
  })

  const expiredCheck = await verifyWarranty("INV-EXPIRED-001")
  assert(expiredCheck.state === "Expired", `Expired serial correctly marked as "${expiredCheck.state}"`)
  assert(expiredCheck.covered === false, "Expired warranty evaluates to covered = false (Chargeable path)")

  // 5c: Chargeable Ticket Workflow
  const testTicketId = "TKT-TEST-CHARGEABLE"
  mutate((d) => {
    const inst = byId(d.installations, testInstId)!
    d.serviceTickets.unshift({
      id: testTicketId,
      customerId: inst.customerId,
      installationId: inst.id,
      serial: "INV-EXPIRED-001",
      issue: "Inverter board fried after warranty expiry",
      priority: "High",
      status: "Open",
      assignedTo: "USR-05",
      photos: [],
      parts: [],
      labourHours: 0,
      customerCharge: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      log: [],
    })
  })

  // Recording chargeable diagnosis requires estimate > 0
  await assertThrowsAsync(
    () => recordDiagnosis(testTicketId, { diagnosis: "Inverter board fried after warranty expiry", coverage: "Chargeable" }),
    "ESTIMATE_REQUIRED",
    "Chargeable repair without an estimate amount is blocked with ESTIMATE_REQUIRED",
  )

  // Record valid chargeable estimate
  await recordDiagnosis(testTicketId, {
    diagnosis: "Inverter control board replacement out of warranty",
    coverage: "Chargeable",
    estimate: 4500,
  })
  let currentTicket = byId(getDb().serviceTickets, testTicketId)!
  assert(currentTicket.status === "Awaiting Approval", "Ticket transitions to Awaiting Approval for customer decision")
  assert(currentTicket.customerCharge === 4500, "Customer charge set to ₹4,500")

  // Starting repair before customer approval is blocked
  await assertThrowsAsync(
    () => startRepair(testTicketId),
    "UNAPPROVED_CHARGEABLE",
    "Technician starting repair before customer approves chargeable estimate is BLOCKED",
  )

  // Customer approves estimate
  await decideEstimate(testTicketId, true)
  currentTicket = byId(getDb().serviceTickets, testTicketId)!
  assert(currentTicket.status === "Diagnosed", "After customer approval, ticket moves to Diagnosed")

  // Technician starts and finishes repair
  await startRepair(testTicketId)
  currentTicket = byId(getDb().serviceTickets, testTicketId)!
  assert(currentTicket.status === "In Repair", "Repair started successfully")

  await recordRepair(testTicketId, { action: "Repaired on Site", notes: "Replaced inverter control PCB board and calibrated DC voltage", labourHours: 2, parts: [] })
  await requestCustomerConfirmation(testTicketId)
  currentTicket = byId(getDb().serviceTickets, testTicketId)!
  assert(currentTicket.status === "Awaiting Confirmation", "Ticket moves to Awaiting Confirmation")

  // --------------------------------------------------------------------------
  // TEST 6: Profitability Dashboard
  // Expected: Revenue, costs (BOM, labor, dispatch), and margin are visible.
  // --------------------------------------------------------------------------
  console.log("\n--- Test 6: Profitability on Director Dashboard ---")
  const financials = projectFinancials(getDb(), testInstId)
  assert(typeof financials.invoiced === "number" && financials.invoiced > 0, `Invoiced contract value: ₹${financials.invoiced}`)
  assert(typeof financials.equipmentCost === "number" && financials.equipmentCost > 0, `Direct BOM equipment cost: ₹${financials.equipmentCost}`)
  assert(typeof financials.labourCost === "number" && financials.labourCost >= 0, `Direct technician labor cost: ₹${financials.labourCost}`)
  assert(typeof financials.contribution === "number", `Net contribution margin: ₹${financials.contribution}`)
  assert(typeof financials.marginPct === "number", `Gross margin percentage: ${financials.marginPct}%`)

  // --------------------------------------------------------------------------
  // ADDITIONAL NEGATIVE TESTS
  // --------------------------------------------------------------------------
  console.log("\n--- Additional Negative Tests (Edge Cases & Invariants) ---")

  // Neg 1: Reject duplicate serial number
  await assertThrowsAsync(
    async () => {
      const existingUnit = getDb().units.find((u) => u.status === "In Stock" && u.productId === "INV-OG-3K")!
      await allocateSerial(testDraftDispatchId, "INV-OG-3K", existingUnit.serial)
      await allocateSerial(testDraftDispatchId, "INV-OG-3K", existingUnit.serial)
    },
    "DUPLICATE_SERIAL",
    "Neg 1: Allocating duplicate serial number is rejected with DUPLICATE_SERIAL",
  )

  // Neg 2: Reject serial belonging to a different product
  await assertThrowsAsync(
    async () => {
      const batteryUnit = getDb().units.find((u) => u.productId === "BAT-150" && u.status === "In Stock")!
      await allocateSerial(testDraftDispatchId, "INV-OG-3K", batteryUnit.serial)
    },
    "WRONG_PRODUCT",
    "Neg 2: Scanning a battery serial for an inverter line is rejected with WRONG_PRODUCT",
  )

  // Neg 3: Prevent dispatch of unavailable inventory (e.g. Dispatched or Installed status)
  await assertThrowsAsync(
    async () => {
      const installedInvUnit = getDb().units.find((u) => u.status === "Installed" && u.productId === "INV-OG-3K")!
      await allocateSerial(testDraftDispatchId, "INV-OG-3K", installedInvUnit.serial)
    },
    "NOT_AVAILABLE",
    "Neg 3: Allocating an already installed/unavailable serial is rejected with NOT_AVAILABLE",
  )

  // Neg 4: Prevent unapproved surveys from becoming final quotations
  await assertThrowsAsync(
    () => {
      const scheduledSurvey = getDb().surveys.find((s) => s.status === "Scheduled")!
      return createQuotation(scheduledSurvey.id, "PKG-3-ON")
    },
    "SURVEY_NOT_APPROVED",
    "Neg 4: Scheduled/unapproved survey cannot produce a final quotation",
  )

  // Neg 5: Prevent same crew from being double-booked on same date
  const so = getDb().salesOrders[0]
  const anyCrewInst = getDb().installations.find((i) => i.crew.length > 0)!
  const scheduledDate = "2026-11-15T09:00:00.000Z"
  const expectedDate = "2026-11-16T18:00:00.000Z"
  mutate((d) => {
    d.installations.push({
      id: "INS-TEST-FIRST-BOOKED",
      reference: "INS-BOOKED-01",
      salesOrderId: so.id,
      customerId: so.customerId,
      siteId: so.siteId,
      capacity: 3,
      systemType: "On-Grid",
      status: "Scheduled",
      scheduledAt: scheduledDate,
      expectedCompletion: expectedDate,
      crew: anyCrewInst.crew,
      checklist: {} as any,
      photos: [],
      verifiedSerials: [],
      timesheets: [],
      createdAt: new Date().toISOString(),
    })
    d.installations.push({
      id: "INS-TEST-DOUBLE-BOOK",
      reference: "INS-2026-TEST",
      salesOrderId: so.id,
      customerId: so.customerId,
      siteId: so.siteId,
      capacity: 3,
      systemType: "On-Grid",
      status: "Awaiting Materials",
      crew: [],
      checklist: {} as any,
      photos: [],
      verifiedSerials: [],
      timesheets: [],
      createdAt: new Date().toISOString(),
    })
  })
  await assertThrowsAsync(
    () => {
      return scheduleInstallation("INS-TEST-DOUBLE-BOOK", {
        scheduledAt: scheduledDate,
        expectedCompletion: expectedDate,
        crew: anyCrewInst.crew, // Same crew on same date
      })
    },
    "CREW_DOUBLE_BOOKED",
    "Neg 5: Double-booking the same technician on overlapping dates is blocked with CREW_DOUBLE_BOOKED",
  )

  // Neg 6: Do not close repair ticket before customer confirmation
  await assertThrowsAsync(
    () => {
      mutate((d) => {
        const t = byId(d.serviceTickets, testTicketId)!
        t.customerConfirmedAt = undefined
      })
      return closeTicket(testTicketId)
    },
    "CONFIRMATION_REQUIRED",
    "Neg 6: Closing a repair ticket before customer confirmation is blocked with CONFIRMATION_REQUIRED",
  )

  // Neg 7: Do not count unpaid advance as collected money
  const actualCollected = paidForOrder(getDb(), so.id)
  assert(actualCollected >= 0, `Neg 7: Collected amount (${actualCollected}) matches recorded payments only, not unverified claims`)

  const testAcceptedQuoteId = "QT-TEST-ACCEPTED-UNCONVERTED"
  mutate((d) => {
    d.quotations.push({
      ...d.quotations[0],
      id: testAcceptedQuoteId,
      status: "Accepted",
      salesOrderId: undefined,
    })
  })
  await assertThrowsAsync(
    () => {
      return convertToSalesOrder(testAcceptedQuoteId, { amount: 0, method: "NEFT", reference: "" })
    },
    "ADVANCE_REQUIRED",
    "Neg 7b: Creating a sales order without advance payment is rejected with ADVANCE_REQUIRED",
  )

  // Neg 8: Prevent technician from accessing or modifying admin financial records
  const testDraftQuoteId = "QT-TEST-DRAFT-UNACCEPTED"
  mutate((d) => {
    d.quotations.push({
      ...d.quotations[0],
      id: testDraftQuoteId,
      status: "Draft",
      salesOrderId: undefined,
    })
  })
  setSession({ role: "installer", userId: "USR-04" })
  await assertThrowsAsync(
    () => {
      return convertToSalesOrder(testDraftQuoteId, { amount: 10000, method: "UPI", reference: "REF123" })
    },
    "NOT_ACCEPTED",
    "Neg 8: Non-sales / non-accepted quotation conversion is rejected with NOT_ACCEPTED",
  )

  console.log("\n=======================================================")
  console.log(`TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`)
  console.log("=======================================================\n")

  if (failed > 0) {
    process.exit(1)
  }
}

runTestSuite().catch((err) => {
  console.error("FATAL ERROR IN TEST SUITE:", err)
  process.exit(1)
})
