# SunFlow 360 — End-to-End Function Call Trace Maps

This document charts the exact step-by-step function call execution path through the Spring Boot codebase for all five core business workflows.

---

## Flow 1: Solar Quotation Creation & The Survey Gate Invariant

```text
Step 1: Frontend User clicks "Generate Quotation" on CRM Deal
   │
   ▼
[HTTP POST /api/quotations]
   │
   ▼
1. QuotationController.createQuotation(@Valid @RequestBody QuotationCreateRequest request)
   │  └── Validates request fields (capacityKw > 0, systemType != null)
   ▼
2. QuotationService.createQuotation(request)
   │  ├── Fetches associated Lead & Survey entities
   │  ├── Fallback defaults (capacity = 3.0 kW, systemType = "ON_GRID", property = "RESIDENTIAL")
   │  └── Calls BOMCalculationEngine.calculateBOM(capacity, propertyType)
   ▼
3. BOMCalculationEngine.calculateBOM(capacityKw, propertyType)
   │  ├── Math.ceil((kw * 1000) / 540) -> 6 Modules (MOD-540W-MONO)
   │  ├── Inverter SKU matching -> INV-3KW-GRID
   │  ├── Sizing Mounting Structure & DC Cabling (45 meters)
   │  ├── Computes composite 13.80% Solar GST
   │  └── calculatePMSuryaGharSubsidy(kw, "RESIDENTIAL") -> ₹78,000.00
   ▼
4. QuotationRepository.save(new Quotation(..., BOMResult, Status.DRAFT))
   │  └── Persists quotation & quotation_items to PostgreSQL
   ▼
QuotationResponse DTO returned (Status: DRAFT)
```

### The Survey Gate Check When Attempting to Send:
```text
Step 2: User clicks "Send Quotation to Customer"
   │
   ▼
[HTTP POST /api/quotations/{id}/send]
   │
   ▼
1. QuotationController.sendQuotation(@PathVariable UUID id)
   ▼
2. QuotationService.sendQuotation(id)
   │  ├── surveyRepository.findById(quotation.getSurveyId())
   │  │
   │  ├── IF survey.getStatus() != SurveyStatus.APPROVED:
   │  │     └── THROW new IllegalStateException("Survey Gate Violation: Cannot finalize or send...")
   │  │           │
   │  │           ▼
   │  │     GlobalExceptionHandler.handleBadRequestExceptions()
   │  │     └── Returns HTTP 400 Bad Request: "Survey Gate Violation"
   │  │
   │  └── IF survey.getStatus() == SurveyStatus.APPROVED:
   │        ├── quotation.setStatus(QuotationStatus.SENT)
   │        ├── quotation.setSentAt(Instant.now())
   │        └── quotationRepository.save(quotation)
   ▼
QuotationResponse DTO returned (Status: SENT, HTTP 200 OK)
```

---

## Flow 2: Public Website Lead Capture & Automatic Deduplication

```text
Step 1: Prospective Customer submits form on Landing Page
   │
   ▼
[HTTP POST /api/leads]
   │
   ▼
1. LeadController.createLead(@Valid @RequestBody LeadCreateRequest request)
   │  └── Jakarta Bean Validation validates phone number and full name
   ▼
2. LeadService.createLead(request)
   │  ├── Checks for existing active leads with identical phone number
   │  ├── Automatically classifies channel (WEB_FORM) and initial status (NEW)
   │  └── Lead entity instantiated with UUID.randomUUID()
   ▼
3. LeadRepository.save(lead)
   │  └── INSERT INTO leads (id, full_name, phone, monthly_bill, channel, status...)
   ▼
LeadResponse DTO returned (HTTP 201 Created)
```

---

## Flow 3: Field Site Survey Engineering & Feasibility Approval

```text
Step 1: Certified Solar Engineer submits roof measurements & shading analysis
   │
   ▼
[HTTP PATCH /api/surveys/{id}]
   │
   ▼
1. SurveyController.updateAssessment(@PathVariable UUID id, @Valid @RequestBody SurveyAssessmentUpdateRequest req)
   │  └── Checks @DecimalMin("0.0") on roof area and sanctioned load
   ▼
2. SurveyService.updateAssessment(id, req)
   │  ├── survey.setUsableRoofAreaSqFt(req.usableRoofAreaSqFt())
   │  ├── survey.setShadingCondition(req.shadingCondition())
   │  ├── survey.setRecommendedCapacityKw(req.recommendedCapacityKw())
   │  └── survey.setFeasibility(req.feasibility())
   ▼
3. SurveyRepository.save(survey)

-------------------------------------------------------------------------
Step 2: Engineering Manager approves the survey
   │
   ▼
[HTTP POST /api/surveys/{id}/approve]
   │
   ▼
1. SurveyController.approveSurvey(@PathVariable UUID id)
   ▼
2. SurveyService.approveSurvey(id)
   │  ├── survey.setStatus(SurveyStatus.APPROVED)
   │  ├── survey.setCompletedAt(Instant.now())
   │  └── surveyRepository.save(survey)
   ▼
Survey Gate unlocked for linked Quotation!
```

---

## Flow 4: Warehouse Barcode Scanning & Material Dispatch Invariant

```text
Step 1: Storekeeper scans physical barcodes at Pune Central Depot
   │
   ▼
[HTTP POST /api/dispatches/{id}/confirm]
   │
   ▼
1. DispatchController.confirmDispatch(@PathVariable String id, @RequestBody DispatchConfirmRequest req)
   ▼
2. InventoryService.confirmDispatch(id, req.scannedSerials())
   │  │
   │  ├── FOR EACH serial in req.scannedSerials():
   │  │     ├── inventoryRepository.findBySerialNumber(serial)
   │  │     │     └── If missing -> THROW ResourceNotFoundException("Serial " + serial)
   │  │     │
   │  │     ├── IF unit.getStatus() != "AVAILABLE":
   │  │     │     └── THROW IllegalStateException("Serial " + serial + " is not available")
   │  │     │
   │  │     └── unit.setStatus("DISPATCHED")
   │  │
   │  ├── dispatchOrder.setStatus("DISPATCHED")
   │  ├── dispatchOrder.setDispatchedAt(Instant.now())
   │  └── Saves updated inventory units and dispatch order atomically
   ▼
DispatchResponse DTO returned (Status: DISPATCHED, HTTP 200 OK)
```

---

## Flow 5: Customer Post-Commissioning Service Ticket & Automated Warranty Check

```text
Step 1: Customer submits ticket: "Inverter reporting Fault Code F04"
   │
   ▼
[HTTP POST /api/service-tickets]
   │
   ▼
1. ServiceTicketController.createTicket(@Valid @RequestBody ServiceTicketCreateRequest req)
   ▼
2. WarrantyService.createServiceTicket(req)
   │  │
   │  ├── Queries warrantyRepository.findBySerialNumber(req.serialNumber())
   │  │
   │  ├── IF warranty.isPresent() AND warranty.get().getStatus() == "ACTIVE" AND !warranty.get().getEndDate().isBefore(LocalDate.now()):
   │  │     ├── ticket.setWarrantyCovered(true)
   │  │     ├── ticket.setChargeableAmount(BigDecimal.ZERO)
   │  │     └── ticket.setResolutionNotes("Covered under 5-Year Comprehensive Warranty")
   │  │
   │  └── ELSE (Warranty Expired or Missing):
   │        ├── ticket.setWarrantyCovered(false)
   │        ├── ticket.setChargeableAmount(new BigDecimal("1500.00")) // Standard inspection fee
   │        └── ticket.setCustomerConfirmed(false) // Mandatory confirmation gate
   │
   ▼
3. ServiceTicketRepository.save(ticket)
   ▼
TicketResponse DTO returned with coverage decision
```

