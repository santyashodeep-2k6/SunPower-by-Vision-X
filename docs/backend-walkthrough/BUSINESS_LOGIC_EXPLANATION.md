# SunFlow 360 — Business Logic & Domain Invariants

This document explains the core domain logic, mathematical formulas, statutory compliance rules, and automated business invariants implemented in the backend.

---

## 1. The Survey Gate Invariant (Acceptance Test 1)

### Domain Problem:
In the rooftop solar industry, sales teams frequently commit premature pricing quotes to homeowners based on verbal phone calls. When technicians subsequently visit the property, they discover cracked tiles, load-bearing limitations, shadow casting from adjacent buildings, or inadequate electrical panels. The company is then forced to either absorb massive cost overruns or forfeit the contract.

### Code Implementation (`QuotationService.java`):
```java
if (quotation.getSurveyId() == null) {
    throw new IllegalStateException("Survey Gate Violation: Cannot finalize or send quotation without an associated site survey.");
}

Survey survey = surveyRepository.findById(quotation.getSurveyId())
    .orElseThrow(() -> new ResourceNotFoundException("Survey", quotation.getSurveyId()));

if (survey.getStatus() != SurveyStatus.APPROVED) {
    throw new IllegalStateException("Survey Gate Violation: Cannot finalize or send quotation until the site survey is APPROVED. Current survey status: " + survey.getStatus());
}
```

### Business Rule:
- A quotation status cannot transition to `SENT` or `ACCEPTED` without an associated technical site audit.
- The linked survey status **must be explicitly `APPROVED`** by a certified solar engineer.
- If unapproved or pending, the backend throws an `IllegalStateException`, translated by `GlobalExceptionHandler` to `HTTP 400 Bad Request`.

---

## 2. Automated Bill of Materials (BOM) Sizing Engine (Acceptance Test 2)

When a customer or sales representative chooses a system capacity (e.g. **3 kW On-Grid**), the `BOMCalculationEngine` automatically sizes and generates every component of the solar array:

```text
Target Capacity: 3.0 kW (3,000 Watts)
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. PV MODULE SIZING:                                        │
│    Formula: ceil((3000 W) / 540 W) = 6 Modules              │
│    SKU: MOD-540W-MONO (540W Tier-1 Mono PERC)               │
│    Total Generation Peak: 3,240 Wp                          │
├─────────────────────────────────────────────────────────────┤
│ 2. INVERTER MATCHING:                                       │
│    kw <= 3.5 -> INV-3KW-GRID (3 kW On-Grid String Inverter) │
├─────────────────────────────────────────────────────────────┤
│ 3. MOUNTING STRUCTURE:                                      │
│    SKU: STR-GI-ELEVATED (Elevated Hot-Dip Galvanized Iron)  │
│    Quantity: 3.0 kW set                                     │
├─────────────────────────────────────────────────────────────┤
│ 4. DC CABLING:                                              │
│    Formula: max(30, kw * 15) = max(30, 45) = 45 meters     │
│    SKU: BOS-DC-CABLE-4MM (4 sq mm UV-Resistant Dual-Core)   │
├─────────────────────────────────────────────────────────────┤
│ 5. ELECTRICAL PROTECTION (BOS):                             │
│    • AC Distribution Box (BOS-ACDB-40A) with Type-II SPD    │
│    • Chemical Grounding & Earthing Kit (BOS-EARTH-KIT)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Statutory Indian Solar Tax & PM Surya Ghar Subsidy Calculations

### A. Composite Solar GST (13.80%)
Under Indian Ministry of Finance guidelines, rooftop solar contracts are considered composite supplies consisting of both goods and services:
- **70% of value** treated as Solar Equipment & Materials @ **12% GST** $\rightarrow 0.70 \times 12\% = 8.4\%$
- **30% of value** treated as Civil Engineering & Erection Services @ **18% GST** $\rightarrow 0.30 \times 18\% = 5.4\%$
- **Total Composite GST Rate** $= 8.4\% + 5.4\% = \mathbf{13.80\%}$

```java
BigDecimal gstAmount = baseAmount.multiply(new BigDecimal("13.80"))
    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
BigDecimal grossAmount = baseAmount.add(gstAmount);
```

### B. PM Surya Ghar Muft Bijli Yojana Central Subsidy Schedule
The Central Government solar subsidy applies strictly to residential properties:

$$\text{Subsidy}(kW, \text{Type}) = \begin{cases} 
₹0 & \text{if Type } \ne \text{RESIDENTIAL} \\
₹0 & \text{if } kW < 1.0 \\
₹30,000 & \text{if } 1.0 \le kW < 2.0 \\
₹60,000 & \text{if } 2.0 \le kW < 3.0 \\
₹78,000 & \text{if } kW \ge 3.0 \text{ (Capped maximum)}
\end{cases}$$

### Example Net Payable Calculation (3 kW System):
- **Base Hardware & Labor Amount**: ₹1,85,000.00
- **Composite GST (13.8%)**: ₹25,530.00
- **Gross Commercial Total**: ₹2,10,530.00
- **PM Surya Ghar Subsidy**: **$-$₹78,000.00**
- **Net Customer Payable**: $\mathbf{₹1,32,530.00}$

---

## 4. Hardware Serialization & Warehouse Dispatch Invariant (Acceptance Test 3)

### Domain Problem:
In rooftop installations, hardware theft and counterfeit substitutions (e.g. swapping Tier-1 panels for degraded B-grade modules) are industry-wide risks. Additionally, manufacturers require exact panel serial numbers to honor 25-year performance warranties.

### Backend Invariant:
1. Every high-value unit (module, inverter, battery) has a unique physical barcode (`serial_number`) in `inventory_items`.
2. A dispatch order cannot transition to `DISPATCHED` without scanned barcodes matching active `AVAILABLE` units in warehouse inventory.
3. Attempting to dispatch unallocated or duplicate serial numbers throws a validation error:
   ```java
   if (!inventoryItem.getStatus().equals("AVAILABLE")) {
       throw new IllegalStateException("Serial " + serial + " is currently " + inventoryItem.getStatus() + " and cannot be dispatched.");
   }
   ```
4. Upon successful confirmation, the unit status transitions atomically to `DISPATCHED`, preventing double-allocation.

---

## 5. Post-Commissioning Warranty & Service Ticket Invariant (Acceptance Tests 4 & 5)

### A. Automatic Warranty Issuance
When the `InstallationJob` reaches status `COMPLETED`:
- The backend automatically iterates through the installed equipment serial numbers.
- It inserts records into `warranties` with:
  - Workmanship & Inverter: **60 months (5 years)**
  - Tier-1 PV Modules: **300 months (25 years)**
  - Status: `ACTIVE`

### B. Service Ticket Adjudication (Free vs. Chargeable)
When a customer logs a service ticket citing an inverter fault code or power drop:
1. The backend evaluates:
   ```java
   boolean isCovered = warrantyRepository.findBySerialNumber(serialNumber)
       .map(w -> w.getStatus().equals("ACTIVE") && !w.getEndDate().isBefore(LocalDate.now()))
       .orElse(false);
   ```
2. **If Covered**: `ticket.setWarrantyCovered(true)` and `ticket.setChargeableAmount(BigDecimal.ZERO)`.
3. **If Expired / Out of Warranty**: `ticket.setWarrantyCovered(false)` and `ticket.setChargeableAmount(standardTechnicianRate)`.
4. **Negative Test Invariant**: A chargeable repair ticket cannot be resolved or closed until the customer accepts the repair cost estimate (`customer_confirmed = true`).

