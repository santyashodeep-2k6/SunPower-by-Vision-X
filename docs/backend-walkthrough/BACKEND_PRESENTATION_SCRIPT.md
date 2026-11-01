# SunFlow 360 — Backend Presentation Scripts for Hackathon Judges

Use these verbatim scripts to confidently present the SunFlow 360 backend to technical judges.

---

## 1. The 2-Minute Elevator Pitch (Speed Round)

> **Time Target**: 110–120 seconds  
> **Goal**: Hook the judges with domain depth, architectural cleanliness, and real engineering rigor.

*(Stand upright, make eye contact, smile, and speak at an energetic, confident pace.)*

"Good morning, judges! I'm proud to present the backend architecture of **SunFlow 360**—our end-to-end Operations and Engineering Management platform for rooftop solar EPC companies.

While many teams build mockups or generic CRUD apps, we engineered a production-grade, domain-driven backend in **Spring Boot 3.3.5 and Java 21**, backed by **PostgreSQL 18.6** and managed by **Flyway database migrations**.

In rooftop solar, the number one reason companies lose money is premature quotes sent before structural site verification. We solved this at the core architecture level with our **Survey Gate invariant**. In `QuotationService`, a sales quotation cannot transition to `SENT` or be converted into a Sales Order until a certified solar engineer has formally marked the on-site survey as `APPROVED`. If they try, the backend throws an `IllegalStateException` and rejects it.

Furthermore, we built a dedicated **BOM Calculation Engine** that translates system capacity into physical reality: selecting a 3 kW system automatically sizes six 540W Tier-1 Mono PERC modules, matches the 3 kW on-grid inverter, computes 45 meters of DC cabling, applies the official **13.8% composite Indian solar GST**, and automatically deducts the **₹78,000 Central PM Surya Ghar subsidy**.

Finally, we track every panel and inverter down to its physical barcode in `inventory_items`, ensuring zero unallocated dispatches and automatically creating 5-year and 25-year serial warranties upon commissioning.

Our entire backend is running live right now on port 8081 with 100% passing test coverage. I’d love to walk you through any code or architecture details you'd like to inspect!"

---

## 2. The 5-Minute Technical Demo Presentation (Standard Judging Booth)

> **Time Target**: 4.5–5 minutes  
> **Goal**: Demonstrate functional depth, database integrity, business logic, and security.

### Part 1: The Domain Problem & Architectural Setup (60 seconds)
"Hello judges! Rooftop solar installation is one of the most operationally complex industries: it spans CRM, civil engineering, warehouse logistics, high-value milestone payments, and 25-year warranty management. 

To solve this, we architected SunFlow 360 using a **Domain-Driven 3-tier Spring Boot architecture**. The presentation layer is React 19 on Vite, which talks to our Spring Boot backend over stateless REST APIs secured with HMAC-SHA256 JWT tokens. We chose PostgreSQL for ACID compliance and used Flyway to version-control our 11 database migrations."

### Part 2: The Core Business Engine & Survey Gate (90 seconds)
"Let’s look at the core business logic. In `com.visionx.sunflow.quotation`, we have two key classes: `QuotationService` and `BOMCalculationEngine`. 

Notice what happens during quotation creation: the user specifies 3 kW On-Grid. Rather than asking an LLM to guess, our Java engine deterministically calculates:
1. Panel count: $\lceil (3000 / 540) \rceil = 6$ modules of 540W Mono PERC.
2. Inverter capacity: matching a 3 kW On-Grid string inverter.
3. DC Cabling: minimum 30m, scaled by 15m per kW = 45m of 4 sq mm UV-resistant cable.
4. Composite Solar GST: exactly 13.8% (70% goods @ 12% + 30% services @ 18%).
5. PM Surya Ghar subsidy: ₹78,000 flat Central government subsidy for residential properties $\ge 3$ kW.

And here is the critical engineering safeguard: the **Survey Gate**. In line 276 of `QuotationService`, if a sales rep attempts to send or close a quote before the survey is `APPROVED`, the system throws an `IllegalStateException` and returns HTTP 400. We don't permit unverified contracts."

### Part 3: Warehouse Serialization & Post-Commissioning Warranty (90 seconds)
"Next is our physical logistics pipeline in `InventoryService`. Solar modules are high-value assets subject to counterfeiting. In our `inventory_items` table, each unit has a unique `serial_number`. During warehouse dispatch, our API enforces that scanned barcodes match real, available stock. 

Once the installation crew completes the commissioning job, the system automatically triggers our `WarrantyService`, which generates a 5-year workmanship warranty and serial-linked hardware coverage. If a customer later raises a service ticket, our backend checks the serial's warranty end date. If active, the repair is covered at ₹0; if expired, the backend generates an itemized repair estimate and mandates customer approval before work can proceed."

### Part 4: Conclusion & Live Verification (30 seconds)
"All 10 domain controllers, 11 Flyway migrations, and 40 automated unit and integration tests are passing cleanly. The backend is live right now at port 8081. What parts of the codebase would you like to explore first?"

---

## 3. Delivery Tips for Judges

1. **Be Proud of Deterministic Math**: If a judge asks why you didn't use AI for the BOM or subsidy calculation, say: *"Financial and electrical engineering should never hallucinate. We use AI for natural language operations and deterministic Java algorithms for engineering math."* Judges love hearing this maturity.
2. **Body Language**: Do not look down at the keyboard. Point directly at the diagrams and code on your monitor.
3. **Pacing**: Speak at a measured tempo. Pause for 1 second after naming a key feature ("the Survey Gate... *pause* ...which prevents unverified quotes").

