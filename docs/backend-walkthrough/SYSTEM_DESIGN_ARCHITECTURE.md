# SunFlow 360 — End-to-End System Design & Architecture Blueprint

This document details the complete end-to-end system design of **SunFlow 360**, covering the presentation tier, network edge, security filter pipeline, micro-domain service architecture, business rule engines, persistence tier, and external integrations.

---

## 1. High-Level System Architecture Diagram

```mermaid
flowchart TB
    %% Client Tier
    subgraph CLIENTS ["1. Client & Presentation Layer"]
        direction LR
        WEB["React 19 SPA (Vite + Tailwind v4)<br/>• Port: 8443<br/>• Role Dashboards & Portals"]
        MOBILE["Mobile App (React Native Expo)<br/>• iOS / Android<br/>• Camera Barcode & GPS Audit"]
        PASSPORT["Public Digital Solar Passport<br/>• QR-Code Accessible<br/>• 25-Yr System Certificate"]
    end

    %% Network & Edge Tier
    subgraph EDGE ["2. Network, Edge & Gateway Layer"]
        CORS["CORS Policy Enforcement<br/>• Allowed Origins: http://localhost:8443<br/>• Methods: GET, POST, PUT, PATCH, DELETE"]
        SSL["TLS / SSL Termination<br/>• HTTPS / WSS Protocols"]
        RATE["Rate Limiter & HTTP Reverse Proxy"]
    end

    CLIENTS --> EDGE

    %% Security & Filter Pipeline
    subgraph SECURITY ["3. Spring Security 6 & Filter Pipeline"]
        direction TB
        JWT_FILTER["JwtAuthenticationFilter<br/>• Bearer Token Extraction<br/>• HMAC-SHA256 Signature Verification"]
        SEC_CTX["SecurityContextHolder<br/>• Thread-Local Principal Injection"]
        RBAC["Method Security (@EnableMethodSecurity)<br/>• 8 Roles: ADMIN, SALES_REP, SURVEYOR,<br/>ENGINEER, INVENTORY_MGR, INSTALLER, CUSTOMER, SUPPORT"]
        BCRYPT["BCryptPasswordEncoder<br/>• Salt Rounds: 10"]
    end

    EDGE --> SECURITY

    %% Controller Tier
    subgraph CONTROLLERS ["4. REST API Controller Layer (Port: 8081)"]
        direction TB
        C_AUTH["AuthController<br/>/api/auth/*"]
        C_LEAD["LeadController<br/>/api/leads/*"]
        C_SURVEY["SurveyController<br/>/api/surveys/*"]
        C_QUOTE["QuotationController<br/>/api/quotations/*"]
        C_ORDER["Order & PaymentController<br/>/api/orders/*, /api/payments/*"]
        C_INV["Inventory & DispatchController<br/>/api/inventory/*, /api/dispatches/*"]
        C_WARRANTY["Warranty & TicketController<br/>/api/warranties/*, /api/service-tickets/*"]
        C_AI["Assistant & VoiceController<br/>/api/assistant/*, /api/voice/*"]
        C_DIRECTOR["AnalyticsController<br/>/api/analytics/director-kpis"]
    end

    SECURITY --> CONTROLLERS

    %% Service & Domain Engines
    subgraph SERVICES ["5. Business Logic & Domain Engine Layer"]
        direction TB
        ENGINE_GATE["🛡️ Survey Gate Engine<br/>• Hard Barrier: Blocks Final Quotes without APPROVED Survey"]
        ENGINE_BOM["⚡ BOM Calculation Engine<br/>• 540W Mono PERC Panel Sizing<br/>• Inverter Matching & 45m Cabling<br/>• 13.80% Composite Solar GST<br/>• PM Surya Ghar Subsidy (₹78,000 max)"]
        ENGINE_SERIAL["📦 Hardware Serialization Engine<br/>• Barcode Verification<br/>• Enforces Available Physical Stock"]
        ENGINE_WARRANTY["📜 Warranty & SLA Adjudication<br/>• Auto-generates 5-Yr & 25-Yr Coverage<br/>• Ticket Coverage: ₹0 Free vs Chargeable"]
        ENGINE_ERROR["🚨 GlobalExceptionHandler<br/>• @RestControllerAdvice (RFC 7807 Error DTOs)"]
    end

    CONTROLLERS --> SERVICES

    %% Persistence Layer
    subgraph PERSISTENCE ["6. Data Access & ORM Layer"]
        direction TB
        JPA["Spring Data JPA Repositories<br/>• LeadRepository, SurveyRepository<br/>• QuotationRepository, OrderRepository<br/>• InventoryRepository, WarrantyRepository"]
        HIBERNATE["Hibernate 6.5.3 ORM<br/>• Entity State Tracking & Dirty Checking<br/>• Declarative @Transactional Boundaries"]
        HIKARI["HikariCP Connection Pool<br/>• Max Pool Size: 10<br/>• Leak Detection: 20000ms"]
    end

    SERVICES --> PERSISTENCE

    %% Database Layer
    subgraph DATABASE ["7. Database & Storage Layer"]
        direction TB
        FLYWAY["Flyway 10.10.0 Engine<br/>• Migrations V1 -> V11 (Strict Schema Versioning)"]
        PG["PostgreSQL 18.6 (`sunflow_dev` DB)<br/>• Relational Integrity & Cascades<br/>• B-Tree Performance Indices<br/>• Audit Timestamps & CHECK Constraints"]
        
        subgraph TABLES ["Relational Schema Tables"]
            direction LR
            T_CRM["leads<br/>surveys<br/>customers"]
            T_SALES["quotations<br/>quotation_items<br/>products"]
            T_OPS["sales_orders<br/>payments<br/>dispatch_orders"]
            T_HARDWARE["inventory_items<br/>warranties<br/>service_tickets"]
        end
    end

    PERSISTENCE --> DATABASE
    FLYWAY --> PG
    PG --> TABLES

    %% External Systems
    subgraph EXTERNAL ["8. External Integrations & Third-Party APIs"]
        ELEVEN["ElevenLabs AI Voice Agent<br/>• 24/7 Voice Support Webhook"]
        GEMINI["Gemini 2.5 Flash / Pro LLM<br/>• Operations Intelligence Copilot"]
        DISCOM["DISCOM Net-Metering Portals<br/>• Bi-Directional Grid Approvals"]
        SUBSIDY["National PM Surya Ghar Portal<br/>• Direct Benefit Transfer (DBT)"]
    end

    SERVICES -.-> EXTERNAL
```

---

## 2. Layer-by-Layer Architectural Breakdown

### A. Presentation & Client Layer (Port 8443)
* **Single-Page Application (SPA)**: Built using **React 19**, **TypeScript**, and **Vite**, styled with **Tailwind CSS v4**.
* **Navigation & Routing**: Managed via `react-router` with role-based route guards (`canAccess`) protecting views according to the authenticated user's segment.
* **State Management**: Reactive in-memory UI store synchronized with backend REST APIs, supporting responsive offline fallbacks.
* **Mobile Client**: Companion **React Native Expo** app (`sunpower-mobile`) providing on-site camera barcode scanning, GPS geolocation tagging, and technician installation checklists.

### B. Security & Gateway Pipeline
```text
HTTP Request (Client)
   │
   ▼
[CORS Filter] ──> Origin: http://localhost:8443, Credentials: true
   │
   ▼
[JwtAuthenticationFilter]
   ├── Extracts Bearer Token from HTTP "Authorization" header
   ├── Validates HMAC-SHA256 signature using secret key
   ├── Decodes claims: Subject (Email), Roles (Authorities), Expiration
   └── Sets SecurityContextHolder.getContext().setAuthentication(...)
   │
   ▼
[SecurityFilterChain Authorization Rules]
   ├── Public Whitelist: /api/auth/**, /api/health, /api/leads, /actuator/**
   └── Authenticated: All Quotation, Order, Dispatch, and Financial Endpoints
```

### C. Domain Controller & Service Engines (Port 8081)
The backend employs a feature-sliced modular architecture where domain entities are decoupled from external transfer contracts using **DTO records**:

1. **The Survey Gate Engine (`QuotationService.java`)**:
   - Inspects the linked survey record prior to quote finalization.
   - Throws `IllegalStateException` unless `survey.getStatus() == SurveyStatus.APPROVED`.
2. **The Solar BOM Calculation Engine (`BOMCalculationEngine.java`)**:
   - Calculates module count: $\lceil (\text{Capacity in Watts}) / 540\text{ W} \rceil$.
   - Sizes matching on-grid string inverter, structure tonnage, and UV-resistant DC cabling.
   - Computes statutory **13.80% composite Indian solar GST**.
   - Calculates **PM Surya Ghar Muft Bijli Yojana Central Subsidy**:
     - $< 1\text{ kW}$: ₹0.00
     - $1\text{ to }<2\text{ kW}$: ₹30,000.00
     - $2\text{ to }<3\text{ kW}$: ₹60,000.00
     - $\ge 3\text{ kW}$: ₹78,000.00 (Max statutory cap)
3. **Hardware Serialization Engine (`InventoryService.java`)**:
   - Mandates unique physical barcode scanning for modules and inverters during warehouse dispatch.
   - Atomically transitions status: `AVAILABLE` $\rightarrow$ `RESERVED` $\rightarrow$ `DISPATCHED` $\rightarrow$ `INSTALLED`.
4. **Warranty & SLA Adjudication (`WarrantyService.java`)**:
   - Plant commissioning auto-creates a **5-year workmanship warranty** and **25-year panel performance warranty**.
   - Service ticket intake auto-checks serial expiration: Active warranty = **₹0.00 Covered Repair**; Expired warranty = Chargeable estimate requiring customer sign-off.

### D. Data Persistence & Flyway Migrations
* **Engine**: PostgreSQL 18.6 (`sunflow_dev` database on port 5432).
* **Connection Pooling**: HikariCP with 10 maximum connections and 20,000ms leak detection.
* **Schema Governance**: Managed via **Flyway 10.10.0** with strict linear migrations (`V1__...` through `V11__...`). Zero manual database schema alterations are permitted.

---

## 3. End-to-End Solar Lifecycle Dataflow

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Solar Customer
    actor Sales as Sales Representative
    actor Surveyor as Field Surveyor
    actor Engineer as Project Engineer
    actor Warehouse as Storekeeper
    participant API as Spring Boot API (8081)
    participant DB as PostgreSQL 18.6

    Customer->>API: 1. Submit Inquiry (POST /api/leads)
    API->>DB: Store Lead (Status: NEW)
    Sales->>API: 2. Qualify & Schedule Site Visit (POST /api/surveys)
    API->>DB: Store Survey (Status: SCHEDULED)

    Surveyor->>API: 3. Record Roof Measurements & Photos (PATCH /api/surveys/{id})
    API->>DB: Update Usable Area, Shading & Sanctioned Load
    Engineer->>API: 4. Approve Feasibility (POST /api/surveys/{id}/approve)
    API->>DB: Update Status to APPROVED (Survey Gate Unlocked!)

    Sales->>API: 5. Generate Quotation (POST /api/quotations)
    Note over API: BOM Engine sizes 6x 540W modules,<br/>matches 3 kW inverter, computes 13.8% GST,<br/>deducts ₹78,000 PM Surya Ghar subsidy
    API->>DB: Save Quotation & BOM Line Items (Status: DRAFT)
    Sales->>API: 6. Send Quote (POST /api/quotations/{id}/send)
    Note over API: Survey Gate validates survey is APPROVED
    API->>DB: Status: SENT

    Customer->>API: 7. Accept Quote & Pay 20% Advance (POST /api/orders)
    API->>DB: Create Sales Order (Status: CONFIRMED)

    Warehouse->>API: 8. Scan Physical Barcodes (POST /api/dispatches/{id}/confirm)
    Note over API: Validates serials exist in warehouse & status is AVAILABLE
    API->>DB: Mark Serials DISPATCHED & Order DISPATCHED

    Engineer->>API: 9. Complete Commissioning & Capture Signature (PATCH /api/orders/{id})
    Note over API: Auto-generates 5-Year Workmanship Warranty<br/>and 25-Year Performance Warranty
    API->>DB: Status: COMMISSIONED & Warranties ACTIVE
    API-->>Customer: 10. Issues QR Digital Solar Asset Passport
```
