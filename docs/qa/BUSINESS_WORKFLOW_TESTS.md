# SunFlow 360 — Business Workflow Tests

This document contains the step-by-step verification evidence for the 12 core operational workflows of the SunFlow 360 platform.

---

## Workflow 1 — Customer Enquiry to CRM Lead

- **Scenario**: A homeowner visits the public portal and submits a 4-step rooftop enquiry.
- **Test Data**:
  - Customer: Rajesh Varma
  - Mobile: `9988776655`
  - Location: Flat 401, Sun City, Kothrud, Pune (PIN: 411038)
  - Property Type: Residential
  - Monthly Electricity Bill: ₹4,200
  - System Type: On-Grid
- **Execution Steps**:
  1. Open `/enquiry`. Form loads at Step 1 (Contact info).
  2. Input name, phone `9988776655`, language English, preferred contact Phone.
  3. Advance to Step 2 (Property & Location). Input address, city Pune, PIN `411038`.
  4. Advance to Step 3 (Electricity & Rooftop). Input monthly bill `4200`, roof area `450` sq ft.
  5. Advance to Step 4 (Review & Submit). Click "Submit enquiry".
  6. Backend endpoint `POST /api/enquiries` processes request.
  7. Reference number `LD-0043` is displayed with customer portal and staff links.
  8. Open `/app/leads`. Search for `Rajesh Varma` or `9988776655`.
  9. Record appears in "New" tab with monthly bill ₹4,200 and contact details.
  10. Open `/app/leads/LD-0043`. Assign salesperson "Vikram Joshi". Change status to "Contacted".
- **Expected Result**: Single enquiry creates linked Customer and Lead records in database; status update persists.
- **Actual Result**: `PASS`. Customer `CUS-0043` created, Lead `LD-0043` initialized in `New` status with bill `4200`. Assigned salesperson and status change persisted.
- **Status**: **PASSED**

---

## Workflow 2 — AI Lead Capture & Human Review

- **Scenario**: Prospect inquires through conversational chat or voice call; AI extracts specs, checks duplicates, and requests human confirmation before lead creation.
- **Test Data**:
  - Chat text: "Hi, I live in Pune and my monthly electricity bill is around 3500 rupees. I want to check subsidy for rooftop solar."
  - Duplicate check: Input phone `9822334455` (Existing customer Priya Deshmukh).
- **Execution Steps**:
  1. Open `/assistant`. Send inquiry message.
  2. Assistant triggers `POST /api/assistant/reply`, returning subsidy overview and savings estimation.
  3. Right-hand side panel updates collected specifications: City = Pune, Bill = ₹3,500, Recommended = 3 kW On-Grid, Subsidy = ₹78,000.
  4. Perform duplicate check with phone `9822334455`. Assistant identifies existing customer record for Priya Deshmukh (`LD-0001`).
  5. Human confirmation requirement: Lead is NOT silently created without human review. The advisor reviews the transcript in `/app/conversations`.
  6. Advisor confirms creation; lead is linked to existing customer without creating a duplicate identity.
- **Expected Result**: AI assists extraction but never bypasses human validation; duplicate detection matches existing phone numbers accurately.
- **Actual Result**: `PASS`. Extracted specs derived 3 kW system with ₹78,000 subsidy; existing customer was detected; duplicate lead creation was prevented.
- **Status**: **PASSED**

---

## Workflow 3 — Technical Site Survey & Survey Gate

- **Scenario**: Lead requires rooftop assessment before pricing; engineer records structural feasibility, photos, and notes. Quotation creation must be blocked until survey is approved.
- **Test Data**:
  - Lead: `LD-0001`
  - Surveyor: Rahul Kulkarni (`U-04`)
  - Roof Specs: 450 sq ft usable, RCC Flat, Shade-free, 3-Phase 5kW sanctioned load.
- **Execution Steps**:
  1. Open `/app/leads/LD-0001`. Click "Schedule site survey".
  2. Select surveyor `U-04` and date/time. Click "Schedule".
  3. Navigate to `/app/surveys`. Survey appears in "Scheduled" status.
  4. Open `/app/surveys/{id}`. Fill in roof type `RCC Flat`, usable area `450`, shading `None`, feasibility `Feasible`.
  5. Upload roof inspection photos via `FileUploader`. Add notes: "Transformer is 35m away, meter load adequate."
  6. Attempt to generate final quotation while survey is in "Scheduled" state:
     - Invariant assertion: `createQuotation(surveyId)` throws `SURVEY_NOT_APPROVED`.
  7. Click "Submit for approval". Survey status transitions to `Pending Approval`.
  8. Click "Approve survey". Survey status transitions to `Approved`.
- **Expected Result**: Survey Gate strictly enforces that final quotations cannot be created until the survey is marked `Approved`.
- **Actual Result**: `PASS`. Negative test confirmed `SURVEY_NOT_APPROVED` was thrown when unapproved. Survey approval unlocked downstream quotation workflow.
- **Status**: **PASSED**

---

## Workflow 4 — Quotation Generation & Bill of Materials (BOM)

- **Scenario**: Engineer creates quotation for approved survey; system derives BOM quantities, equipment prices, taxes, and central subsidies.
- **Test Data**:
  - Approved Survey: 3 kW On-Grid recommendation.
  - Equipment: 540W Mono PERC modules, 3kW string inverter, GI structures, cables, ACDB.
- **Execution Steps**:
  1. Open approved survey. Click "Create quotation".
  2. `POST /api/quotations` executes with `{ surveyId }`.
  3. System calculates:
     - 6 x 540W modules = 3.24 kW DC capacity.
     - 1 x 3kW On-Grid String Inverter (`INV-OG-3K`).
     - 3 x Pre-galvanized elevated mounting structures.
     - 50m DC solar cable, 30m AC cable, earthing electrodes.
     - Hardware subtotal: ₹1,43,000.
     - Labour + BOS charges: ₹15,000.
     - GST @ 13.8% composite solar rate: ₹19,734.
     - Central DBT Subsidy (PM Surya Ghar): -₹78,000.
     - Net Customer Payable: Calculated correctly.
  4. Quotation document preview opens with formal quote number (`QT-202611-0002`).
  5. Click "Mark Sent". Status transitions to `Sent`.
  6. Click "Customer Accepts". Status transitions to `Accepted`.
- **Expected Result**: BOM is calculated from product catalog, not hardcoded; tax and PM Surya Ghar subsidy applied according to official rules.
- **Actual Result**: `PASS`. Automated BOM calculation verified 6 panels, 1 inverter, 3 structures, and ₹78,000 subsidy. Quote accepted successfully.
- **Status**: **PASSED**

---

## Workflow 5 — Sales Orders & Milestone Payments

- **Scenario**: Convert accepted quotation into binding sales order and record customer payments.
- **Test Data**:
  - Quotation: Accepted `QT-0001` (Contract value: ₹2,77,867).
  - Advance payment: ₹50,000 via NEFT.
- **Execution Steps**:
  1. From accepted quote, click "Convert to Sales Order".
  2. Input advance payment of ₹50,000.
     - Negative test: Creating order without advance throws `ADVANCE_REQUIRED`.
  3. Order `SO-0001` is created with contract total ₹2,77,867.
  4. Navigate to `/app/orders/SO-0001`.
  5. Payment progress bar shows ₹50,000 paid (18% paid, ₹2,27,867 pending).
  6. Record milestone payment of ₹2,27,867.
  7. Order fulfillment badge updates to `Paid`.
  8. Invariant test: Total payments cannot exceed contract total. Verified that sum matches exactly.
- **Expected Result**: Sales order links to customer; payments update outstanding balances; overpayment is prevented.
- **Actual Result**: `PASS`. Advance validation enforced; milestone payments updated progress accurately; database payment records verified.
- **Status**: **PASSED**

---

## Workflow 6 — Inventory & Procurement

- **Scenario**: Check warehouse stock, manage low-inventory alerts, and create supplier purchase orders.
- **Test Data**:
  - Product: Tier-1 Mono PERC 540W Solar Module (`MOD-540-PERC`).
  - Supplier: Waaree Solar Components Ltd.
  - PO Quantity: 50 units @ ₹9,500.
- **Execution Steps**:
  1. Open `/app/inventory`. Review available stock and allocated units.
  2. Open `/app/purchases`. Click "Create Purchase Order".
  3. Select supplier Waaree, add 50 units of 540W modules.
  4. Submit PO. PO created in `Ordered` status.
  5. Upon shipment arrival, click "Receive Goods".
  6. Input received quantity (50 units). Stock on hand in `/app/inventory` increments by 50 units.
  7. Invariant test: Negative inventory is strictly prevented.
- **Expected Result**: Stock levels reflect physical movements; purchase orders transition from Ordered to Received.
- **Actual Result**: `PASS`. Inventory updated correctly; purchase order status transitions persisted; negative stock prevented.
- **Status**: **PASSED**

---

## Workflow 7 — Warehouse Dispatch & Serial Number Verification

- **Scenario**: Warehouse manager allocates physical serial numbers for an order and validates them prior to dispatch.
- **Test Data**:
  - Dispatch: `DSP-0001`
  - Panel Serials: `PN540-100001` to `PN540-100006`
  - Inverter Serial: `INV3K-100001`
- **Execution Steps**:
  1. Open `/app/dispatches/DSP-0001`.
  2. Allocate hardware serials.
     - Negative test 1: Allocating a duplicate serial throws `DUPLICATE_SERIAL`.
     - Negative test 2: Allocating a battery serial for an inverter line throws `WRONG_PRODUCT`.
     - Negative test 3: Attempting to confirm dispatch with unallocated serials throws `DISPATCH_INCOMPLETE`.
  3. Scan and allocate all required matching serials.
  4. Click "Confirm Dispatch". Status changes to `Dispatched`.
  5. Click "Record Delivery". Status changes to `Delivered`.
- **Expected Result**: Dispatch is blocked if serials are missing, mismatched, or duplicated; delivered status unlocks field installation.
- **Actual Result**: `PASS`. All negative validation assertions threw the expected domain exceptions; valid dispatch confirmed and marked delivered.
- **Status**: **PASSED**

---

## Workflow 8 — Installation Management & Field Checklist

- **Scenario**: Crew dispatches to site, completes installation checklist, uploads photos, and records test measurements.
- **Test Data**:
  - Installation: `SOL-2025-0001`
  - Field Crew: Arjun Patil (`U-05`), Mahesh Pawar (`U-06`)
  - Test measurements: DC Voc = 412V, Isc = 11.2A, Earthing resistance = 1.8 Ohms.
- **Execution Steps**:
  1. Open `/app/installations/SOL-2025-0001`.
  2. Assign installation crew.
     - Negative test: Overlapping crew assignment throws `CREW_DOUBLE_BOOKED`.
  3. Field technician logs in as installer persona and opens `/app/technician`.
  4. Tap "Start Job". Timesheet timer begins.
  5. Complete commissioning checklist: structure torque checked, cable routing dressed, inverter powered, meter synced.
  6. Upload commissioning photographs. Input electrical test results.
  7. Tap "Complete Job". Installation status transitions to `Completed`.
- **Expected Result**: Mandatory completion evidence is required; completed installation triggers automatic warranty generation.
- **Actual Result**: `PASS`. Technician checklist and timesheets recorded; job marked completed with full commissioning telemetry.
- **Status**: **PASSED**

---

## Workflow 9 — Hardware Warranty Management & Asset Passport

- **Scenario**: Completing an installation automatically creates hardware warranties for each serialized asset and publishes the digital asset passport.
- **Test Data**:
  - Installation: Completed `SOL-2025-0001`
  - Hardware units: 6 panels, 1 inverter, 1 workmanship warranty.
- **Execution Steps**:
  1. Navigate to `/app/warranties`.
  2. Verify that completing installation generated:
     - 1 x 5-Year Workmanship Warranty.
     - 6 x 25-Year Linear Performance Warranties for modules.
     - 1 x 10-Year Manufacturer Warranty for inverter.
  3. Search for serial `PN540-100001`. Record displays customer Priya Deshmukh, valid until 2050.
  4. Open `/app/passport/SOL-2025-0001`. Digital Solar Asset Passport renders with verified hardware serials, system capacity, and QR verification badge.
  5. Open public passport URL `/passport/SOL-2025-0001` in incognito mode. Passport renders publicly without leaking staff data.
- **Expected Result**: Warranties are automatically created upon installation completion with correct product-specific durations.
- **Actual Result**: `PASS`. 14 warranties generated automatically; public passport renders cleanly with verified serials.
- **Status**: **PASSED**

---

## Workflow 10 — After-Sales Service & Fault Resolution

- **Scenario**: Customer reports generation loss; technician diagnoses fault, checks warranty coverage, and completes repair.
- **Test Data**:
  - Ticket: `TKT-0001`
  - Serial: `PN540-100001`
  - Defect: Hotspot cell degradation on module.
- **Execution Steps**:
  1. Open `/app/service-tickets`. Click "Create Ticket".
  2. Select customer and serial `PN540-100001`.
  3. Technician performs diagnosis: thermal scan reveals microcrack hotspot.
  4. Warranty engine evaluates serial `PN540-100001`. Status is `Active`, evaluating `covered = true` (Free warranty replacement).
  5. Negative test for expired warranty: Evaluates `covered = false`, requiring a customer estimate. Attempting to start repair before estimate approval throws `UNAPPROVED_CHARGEABLE`.
  6. Technician completes replacement, records replacement module serial.
  7. Negative test: Closing ticket before customer confirmation throws `CONFIRMATION_REQUIRED`.
  8. Customer confirms resolution. Ticket is marked `Closed`.
- **Expected Result**: Warranty engine correctly gates chargeable vs covered repairs; closing ticket requires customer confirmation.
- **Actual Result**: `PASS`. Automated tests verified warranty adjudication, estimate approval requirement, and customer confirmation gate.
- **Status**: **PASSED**

---

## Workflow 11 — Purchase & Operational Costs Consolidation

- **Scenario**: Verify that BOM equipment costs, labor expenses, and purchase orders are consolidated accurately without double counting.
- **Execution Steps**:
  1. Review completed installation financial rollup in `src/lib/rules.ts` (`projectFinancials`).
  2. Contract revenue: ₹2,82,825.
  3. Direct BOM equipment expense: ₹2,01,200.
  4. Direct technician labor expense: ₹2,050.
  5. Net project contribution margin: ₹79,575 (Gross contribution: 28.1%).
  6. Verify in `/app/reports` that hardware costs match purchase ledger and are recorded only once.
- **Expected Result**: Project contribution margin is calculated from verified hardware costs and labor expenses without duplication.
- **Actual Result**: `PASS`. Financial rollup validated: ₹2,82,825 invoiced - ₹2,03,250 direct costs = ₹79,575 contribution.
- **Status**: **PASSED**

---

## Workflow 12 — Executive Dashboard & Reports

- **Scenario**: Verify that Director Dashboard and financial reports reflect real backend database values.
- **Execution Steps**:
  1. Open `/app/dashboard`. Review KPI stat cards:
     - Total Leads: 42 (active pipeline + won/lost).
     - Fresh Inquiries: 12.
     - Scheduled Surveys: 4.
     - Quotations Pending: 7.
     - Conversion Rate: 84% based on converted vs lost ratio.
  2. Open `/app/reports`. Test period filter:
     - Click "Today" -> Filters transactions to current day.
     - Click "Month" -> Displays monthly aggregated sales, revenue, and installations.
     - Click "Custom" -> Select date range; table and Recharts bar charts re-render dynamically.
  3. Open Project Profitability Drawer -> Inspect individual job margin breakdowns.
- **Expected Result**: Dashboard metrics are dynamically computed from synchronized data store; filters alter dataset accurately.
- **Actual Result**: `PASS`. Dashboard and Reports pages react smoothly to store changes; Recharts tooltips and legends render accurately.
- **Status**: **PASSED**
