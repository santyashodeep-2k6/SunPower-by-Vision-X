# SunPower 360 — Vision X

**An end-to-end rooftop solar operations platform, designed to connect the customer journey with the operational lifecycle of every installation and the equipment behind it.**

SunPower 360 is a multi-interface solar business management project built for the operational challenges of a growing rooftop solar installer. It brings together customer enquiries, lead management, site surveys, quotations and bills of materials, orders and payments, inventory and dispatch, installation workflows, asset records, warranty checks, after-sales service and director-level visibility.

> **Our design principle:** A solar installation is not a one-day transaction. It creates a long-lived relationship between a customer, a site, an order, installed equipment and future service obligations. SunPower 360 is organized around keeping that relationship traceable.

**Team:** Vision X  
**Repository:** [santyashodeep-2k6/SunPower-by-Vision-X](https://github.com/santyashodeep-2k6/SunPower-by-Vision-X)

---

## Contents

- [1. Problem understanding](#1-problem-understanding)
- [2. Our solution](#2-our-solution)
- [3. Problem-statement coverage](#3-problem-statement-coverage)
- [4. End-to-end workflow](#4-end-to-end-workflow)
- [5. Product capabilities](#5-product-capabilities)
- [6. Architecture](#6-architecture)
- [7. Technology stack](#7-technology-stack)
- [8. Repository structure](#8-repository-structure)
- [9. Run locally](#9-run-locally)
- [10. Configuration and integrations](#10-configuration-and-integrations)
- [11. Demo walkthrough](#11-demo-walkthrough)
- [12. Engineering decisions and business rules](#12-engineering-decisions-and-business-rules)
- [13. Tests](#13-tests)
- [14. Current implementation boundaries](#14-current-implementation-boundaries)
- [15. Roadmap](#15-roadmap)

---

## 1. Problem understanding

A growing rooftop solar company does not operate through a single department or a single transaction. A typical customer journey involves sales, technical surveying, quotation, procurement, warehouse dispatch, field installation and long-term service.

When these activities are spread across WhatsApp conversations, phone calls, spreadsheets, paper registers and individual devices, information gets fragmented:

- A customer enquiry can be missed or followed up late.
- A preliminary estimate can be mistaken for a technically approved design.
- A quotation can omit an accessory or safety component.
- The warehouse may not know the exact kit required for an order.
- A dispatched inverter or battery can become difficult to trace if its serial number is not tied to the installation.
- A technician's work evidence can remain on a personal phone instead of in the project record.
- A later service request can require staff to reconstruct the original installation history.
- Management can see sales totals without understanding work-in-progress, service backlog or the assumptions behind margins.

The supplied problem statement describes a company completing approximately 40 rooftop projects per month, with a 15-person technician team, high-value inventory and long-term warranty obligations. The central challenge is therefore broader than building a CRM or an inventory screen: it is to connect the full operating lifecycle of the solar business.

## 2. Our solution

**SunPower 360 is designed as a shared operational platform with role-oriented interfaces.** Customers, sales executives, surveyors, inventory staff, technicians, service personnel and administrators interact with the parts of the system relevant to their work.

| User | Primary workflow | Intended outcome |
|---|---|---|
| Customer | Enquiry, solar information, installation/service access | A clear route from interest to support |
| Sales | Customer/site records, lead qualification, follow-up, quotation | A traceable sales pipeline |
| Surveyor | Technical site assessment and feasibility status | A technical checkpoint before final proposal |
| Inventory / dispatch | Product stock, BOM requirements, dispatch and serialized equipment | Better material readiness and asset traceability |
| Technician | Assigned work, checklist, progress and site evidence | Structured field execution |
| Service team | Warranty lookup, ticket handling and repair workflow | Accountable after-sales support |
| Director / administrator | Operational indicators, users and settings | A consolidated view of business activity |

The product's domain model uses related identifiers such as `customerId`, `siteId`, `leadId`, `salesOrderId`, `installationId`, equipment serial number, `warrantyId` and `serviceTicketId`. The goal is to make each stage refer back to the same customer and installation context instead of creating unrelated departmental records.

## 3. Problem-statement coverage

The following matrix maps the scenarios in the problem statement to the implementation areas in this repository.

| Problem-statement need | SunPower 360 response | Code areas to inspect |
|---|---|---|
| Capture enquiries from web and other channels | Public enquiry flow, lead capture, customer/site association, duplicate lookup and lead pipeline | `src/pages/public/EnquiryPage.tsx`, `src/services/crm.ts`, backend `lead` and `customer` packages |
| Qualify customers before arranging a survey | Structured customer/property/bill/roof/capacity/system details and preliminary solar estimate | `src/services/assistant.ts`, `src/services/gemini.ts`, `src/lib/catalog.ts` |
| Record roof and electrical feasibility | Survey records, assessment fields, feasibility states, status and approval endpoints | backend `survey` package; `src/pages/app/crm/SurveysPage.tsx` and survey detail page |
| Generate a quote with the required components | Product catalogue, quotation items, capacity-driven BOM calculation and amount calculation | `src/lib/catalog.ts`; backend `quotation` package and `BOMCalculationEngine.java` |
| Record advance and full payments | Payments associated with sales orders and balance validation in the web domain service | `src/services/operations.ts`; backend `order` package |
| Prepare and dispatch the correct kit | Inventory and dispatch domain; BOM-wide availability/reservation logic in the web domain service | backend `inventory` package; `src/services/operations.ts`; dispatch pages |
| Trace each serialized inverter, battery or other unit | Dispatch item serial numbers and warranty records associated with serialized equipment | backend `inventory`, `dispatch` and `warranty` packages |
| Start warranty coverage from dispatch | Warranty automation can create category-based warranty records from dispatched serialized items | `WarrantyAutomationService.java` |
| Capture field execution | Technician-oriented experience, work checklist, progress and photo/evidence interactions | `sunpower-mobile/app/technician.tsx`; web installation/technician pages |
| Record customer handover | Digital signature component and installation completion endpoint; Solar Asset Passport and QR view | `SignatureCapture.tsx`; backend `InstallationController`; `SolarAssetPassport.tsx` |
| Resolve later service issues | Serial-based warranty verification and service-ticket domain workflows | `src/services/aftersales.ts`; backend `warranty` and `service` packages |
| Give management operational visibility | Director metrics for revenue, modeled costs, pending surveys/installations, active orders and open tickets | `ProfitabilityAnalyticsEngine.java`; director dashboard controller/page |

This matrix describes the capabilities and code areas present in the repository. The runtime mode and backend API coverage matter: see [Current implementation boundaries](#14-current-implementation-boundaries) before treating every UI action as a production-persisted workflow.

## 4. End-to-end workflow

The platform is organized around this business sequence:

```text
Customer enquiry
      |
      v
Lead + customer + site record
      |
      v
Qualification and site survey
      |
      v
Feasibility review / approval
      |
      v
Quotation + Bill of Materials (BOM)
      |
      v
Sales order + payment records
      |
      v
Inventory readiness + dispatch + serial numbers
      |
      v
Installation job + checklist + site evidence + handover
      |
      v
Asset record + warranty
      |
      v
Service ticket + diagnosis + repair / replacement
      |
      v
Director-level operational and financial visibility
```

### 4.1 Enquiry and lead qualification

The public enquiry flow collects contact details, preferred language/contact method, property type, address, city, PIN code, monthly electricity bill, roof area, requested capacity and system type. The CRM service can look for an existing customer by phone or email, reuse a matching customer record and associate the enquiry with a site and lead. Lead statuses model the progression from a new enquiry through qualification, survey, quotation and won/lost outcomes.

### 4.2 Preliminary estimate and survey

The assistant domain includes a solar estimate calculator that derives estimated system capacity, generation, gross price, subsidy amount, net amount, savings and payback from the supplied inputs and configured assumptions. This is a **preliminary estimate**, not a substitute for an approved engineering design.

The survey domain records the technical assessment. The backend models feasibility as `FEASIBLE`, `FEASIBLE_WITH_CONDITIONS` or `NOT_FEASIBLE`, alongside roof and electrical assessment data. The survey is the technical checkpoint before finalizing the installation proposal.

### 4.3 Quotation and BOM

The quotation layer uses the product catalogue and system configuration to produce quotation items. The backend `BOMCalculationEngine` derives component quantities from the selected capacity and calculates quotation amounts, GST and subsidy values according to its implemented rules.

The BOM matters because a solar package must translate into the materials required to install it. A package price without a component list does not tell the warehouse what to prepare.

### 4.4 Order and payment

Accepted quotations can progress to sales orders. Payment records are associated with the order. In the web domain service, payment validation checks that the amount is positive, does not exceed the outstanding balance and includes a payment reference.

### 4.5 Inventory, reservation and dispatch

The web domain service includes logic that checks stock for every BOM line before reserving the order kit. If any required item is short, the order moves to an awaiting-stock state rather than reserving only the items that happen to be available. The service can also calculate uncovered shortages and form purchase requests by supplier.

The backend has separate inventory and dispatch domain packages, including serialized dispatch items and endpoints for dispatch creation, validation and item scanning. API-mode parity for the web reservation/procurement actions should be verified before describing those actions as persisted by the backend.

### 4.6 Warranty and asset traceability

The backend `WarrantyAutomationService` can create warranty records from serialized dispatch items, skips serials that already have a warranty record, and chooses a term based on product category. The terms documented in that service are 25 years for modules, 5 years for inverters and 1 year for balance-of-system/structure items. In a real deployment, product-specific manufacturer terms and contractual policies must remain authoritative.

### 4.7 Installation and handover

The project includes installation jobs, technician-oriented screens, checklists, progress/evidence interactions and a signature-capture component. The backend installation completion endpoint accepts a customer signature value. The web application also includes a Solar Asset Passport component that can display installation-related customer, site, order, serialized unit, warranty and service information, along with a QR code and document views.

### 4.8 After-sales service

The after-sales service layer includes serial-based warranty verification and service-ticket logic. In the web domain service, ticket creation validates the customer/installation relationship and checks that a supplied serial belongs to an installed unit at the selected installation. The service logic includes assignment, diagnosis, covered versus chargeable repair paths, customer estimate approval and ticket history. The backend service module exposes its own ticket API; not every web-domain service action currently has a corresponding backend controller endpoint.

### 4.9 Director visibility

The backend analytics service aggregates sales orders, surveys, installation jobs and service tickets to return director dashboard indicators. It calculates revenue and a modeled gross-profit estimate, and includes operational counts such as pending surveys, pending installations, active orders and open service tickets. The current cost assumptions are documented in [Current implementation boundaries](#14-current-implementation-boundaries).

## 5. Product capabilities

### Customer acquisition and CRM

- Multi-step public enquiry form with input validation.
- Customer, site and lead records with shared identifiers.
- Duplicate enquiry lookup by phone/email.
- Lead source and status tracking.
- Lead notes, follow-up and assignment-oriented workflows.
- Conversation capture and assistant enquiry submission paths.

### Solar assistant and voice

- Configurable solar estimation for capacity, generation, price, subsidy, savings and payback.
- Assistant-domain language options for English, Hindi, Marathi and Telugu.
- Gemini API integration in the web assistant service, with recent conversation context and database-derived context when configured.
- Database lookup helpers for customer, lead, quotation, order, installation, ticket, product and serial/warranty-related queries.
- Voice-call UI using the `@elevenlabs/react` Conversational AI SDK.
- Backend voice integration routes for a session response and post-call webhook handling intended to create CRM leads.

**AI implementation note:** the public assistant page labels its chat experience as a scripted demo; the service layer separately contains an optional Gemini execution path. The voice-call interface is a separate ElevenLabs integration. The backend `AssistantController` is currently keyword/rule-based. These are distinct pathways, not one universal LLM/RAG service.

### Surveys and feasibility

- Survey creation, retrieval and update endpoints.
- Technical assessment fields and feasibility states.
- Survey status transitions and approval/rejection-oriented endpoints.
- Survey photo and note support in the backend model/migration history.

### Quotation and commercial workflow

- Product and product-category model.
- Quotation headers and line items.
- Capacity-derived BOM calculation in the backend.
- Configured tax and subsidy calculations in the quotation engine.
- Sales orders and payment records.

### Inventory and dispatch

- Inventory item and status model.
- Inventory-unit, reservation and movement views in the web domain.
- Dispatch orders and dispatch items in the backend.
- Serial-number fields on dispatch records and scan/validation endpoints.
- Full-BOM stock validation and shortage/procurement logic in the web domain service.

### Installation and field operations

- Installation job model and backend endpoints.
- Web installation, dispatch and technician operations pages.
- Expo/React Native technician interface.
- Job checklist, progress, timer and photo/evidence interactions.
- Customer installation tracking views in the mobile app.

### Asset passport and documents

- Installation-oriented Solar Asset Passport component.
- QR code generation for a public passport route.
- Internal and customer-oriented passport views.
- Quotation, invoice and handover document previews.
- Asset-linked view of serialized equipment, warranties, service tickets and replacements.

### Warranty and service

- Warranty entity, repository, controller and automation service in the backend.
- Automatic warranty-record generation from applicable serialized dispatch items.
- Serial-number warranty lookup and verification.
- Service-ticket create/list/detail endpoints in the backend.
- Richer ticket lifecycle rules in the web after-sales domain service, including assignment, diagnosis and estimate approval.

### Administration and analytics

- JWT authentication infrastructure and role definitions in the backend.
- User and operations-support modules.
- Director dashboard metrics for commercial and operational indicators.
- Backend health endpoint and Springdoc OpenAPI dependency.

## 6. Architecture

SunPower 360 contains three application surfaces: the React web application, a Spring Boot API and an Expo/React Native mobile application.

```text
                         SUNPOWER 360
                              |
              +---------------+---------------+
              |               |               |
          Public Web      Operations Web    Mobile App
         React + TS        React + TS       Expo / RN
              |               |               |
              +---------------+---------------+
                              |
                    HTTP / REST API boundary
                              |
                     Spring Boot 3.3.5
                           Java 21
                              |
     +----------+-------------+-------------+----------+
     |          |             |             |          |
    CRM       Survey       Quotation       Orders    Inventory
     |          |             |             |          |
     +----------+-------------+-------------+----------+
                              |
           Installation / Warranty / Service
                              |
                 Analytics / Voice integration
                              |
                    Spring Data JPA
                              |
                         PostgreSQL
                              |
                           Flyway
                     schema migrations

External integrations in the codebase:
- Google Gemini API (optional web assistant path)
- ElevenLabs Conversational AI (voice interface)
```

### Backend module boundaries

The backend follows package-level business modules:

| Package | Responsibility |
|---|---|
| `auth` | Authentication endpoints and service |
| `user` | User records and user API |
| `customer` | Customer and site records |
| `lead` | Enquiry/lead capture and lifecycle |
| `survey` | Site assessment and feasibility |
| `quotation` | Product catalogue, quotations and BOM engine |
| `order` | Sales orders and payment records |
| `inventory` | Inventory and dispatch |
| `installation` | Installation jobs and completion |
| `warranty` | Warranty records and automatic generation |
| `service` | Service tickets |
| `analytics` | Director dashboard metrics |
| `voice` | Voice session/webhook integration surface |
| `common` | Security configuration, health, exception handling and supporting operations |

### Persistence and schema management

- PostgreSQL is the configured relational database.
- Spring Data JPA repositories provide persistence access.
- Hibernate is configured with `ddl-auto: validate`; the application expects schema migrations rather than automatically mutating the schema.
- Flyway migrations are maintained under `Backend/src/main/resources/db/migration`.
- The migration history covers leads, surveys, users/customers/sites, demo data, products/quotations, orders/inventory/dispatch, warranties/installations/service and subsequent schema changes.

## 7. Technology stack

| Layer | Technologies |
|---|---|
| Web frontend | React 19, TypeScript, Vite 8, React Router |
| Web styling and UI | Tailwind CSS v4, Lucide React, Recharts |
| Voice UI | `@elevenlabs/react` |
| AI assistant integration | Google Gemini API integration |
| Mobile | React Native 0.74, Expo SDK 51, Expo Router, TypeScript |
| Mobile device packages | Expo SecureStore, Local Authentication, Camera, Location, Notifications, Linear Gradient |
| Backend | Java 21, Spring Boot 3.3.5, Spring Web, Spring Security, Validation, Actuator |
| Authentication library | JJWT 0.12.6 |
| Persistence | Spring Data JPA, Hibernate, PostgreSQL |
| Database migration | Flyway |
| API documentation | Springdoc OpenAPI 2.6.0 |
| Tests | Spring Boot Test, H2 test dependency |

## 8. Repository structure

```text
SunPower-by-Vision-X/
├── Backend/
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/visionx/sunflow/
│       │   ├── analytics/
│       │   ├── assistant/
│       │   ├── auth/
│       │   ├── common/
│       │   ├── customer/
│       │   ├── installation/
│       │   ├── inventory/
│       │   ├── lead/
│       │   ├── order/
│       │   ├── quotation/
│       │   ├── service/
│       │   ├── survey/
│       │   ├── user/
│       │   ├── voice/
│       │   └── warranty/
│       ├── main/resources/
│       │   ├── application.yml
│       │   └── db/migration/
│       └── test/java/com/visionx/sunflow/
│
├── src/                              # React web application
│   ├── components/
│   │   ├── layout/
│   │   ├── special/
│   │   └── ui/
│   ├── data/                          # Demo seed/store and identifiers
│   ├── lib/                           # Domain types, rules, catalogue, helpers
│   ├── pages/
│   │   ├── app/                       # CRM, operations, after-sales, admin
│   │   ├── portal/                    # Customer portal
│   │   └── public/                    # Public site, enquiry, assistant
│   └── services/                      # API client and domain services
│
├── sunpower-mobile/                  # Expo / React Native application
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (portal)/
│   │   ├── technician.tsx
│   │   ├── calculator.tsx
│   │   ├── documents.tsx
│   │   └── subsidy.tsx
│   ├── components/
│   ├── services/
│   └── theme/
│
├── .env.example
└── .gitignore
```

## 9. Run locally

The repository contains three independently started projects: web frontend, Spring Boot backend and mobile application. Start the components you want to demonstrate.

### Prerequisites

- Node.js and npm compatible with the root Vite toolchain.
- Java 21.
- Maven.
- PostgreSQL.
- Android Studio/emulator or Expo Go for mobile testing.
- Gemini and/or ElevenLabs configuration only when testing those external integrations.

### 9.1 Clone the repository

```bash
git clone https://github.com/santyashodeep-2k6/SunPower-by-Vision-X.git
cd SunPower-by-Vision-X
```

### 9.2 Start the web application

```bash
npm install
cp .env.example .env
npm run dev
```

Vite prints the local development URL in the terminal.

Create and preview a production build:

```bash
npm run build
npm run preview
```

### 9.3 Configure and start the backend

Create a PostgreSQL database. The default configuration points to `sunflow_dev`:

```sql
CREATE DATABASE sunflow_dev;
```

Configure the datasource before starting Spring Boot.

**Windows PowerShell:**

```powershell
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/sunflow_dev"
$env:SPRING_DATASOURCE_USERNAME="postgres"
$env:SPRING_DATASOURCE_PASSWORD="your-local-password"
```

**macOS / Linux:**

```bash
export SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/sunflow_dev"
export SPRING_DATASOURCE_USERNAME="postgres"
export SPRING_DATASOURCE_PASSWORD="your-local-password"
```

Start the backend:

```bash
cd Backend
mvn spring-boot:run
```

The default backend port is `8081`. Flyway migrations are configured to run at startup, and Hibernate validates the resulting schema.

The project includes Springdoc OpenAPI. With the backend running, try:

```text
http://localhost:8081/swagger-ui/index.html
```

### 9.4 Connect the web app to the backend

In the root `.env` file, set:

```env
VITE_SUNFLOW_API_URL=http://localhost:8081/api
```

Restart Vite after changing environment variables.

If `VITE_SUNFLOW_API_URL` is omitted, the web service layer uses its browser-local demo store. Demo data persists in localStorage; it is not PostgreSQL persistence.

### 9.5 Start the mobile application

In a separate terminal:

```bash
cd sunpower-mobile
npm install
npm start
```

Use the Expo terminal prompts to run the app on a supported target. The mobile API client defaults to `http://10.0.2.2:8081/api` for the Android emulator and `http://localhost:8081/api` on other platforms. Override it with `EXPO_PUBLIC_API_URL` when needed.

For a physical phone, `localhost` refers to the phone itself. Use the development computer's reachable LAN IP address or a deployed backend URL, for example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:8081/api
```

Replace the example IP with the address of the computer running the backend.

## 10. Configuration and integrations

### Web environment variables

| Variable | Purpose | Required |
|---|---|---|
| `VITE_SUNFLOW_API_URL` | Base URL for Spring Boot API requests. When unset, the web app uses the local demo store. | Optional for demo; required for API mode |
| `VITE_GEMINI_API_KEY` | Enables the optional Gemini assistant path. | Optional |
| `VITE_ELEVENLABS_AGENT_ID` | Overrides the agent identifier used by the voice UI. | Optional if the code default is used |

Copy `.env.example` to `.env`. Never commit real provider keys, database passwords or production secrets.

### Gemini assistant path

The web assistant service checks whether a Gemini API key is configured. When available, it sends recent conversation turns together with solar-domain instructions and database-derived context to the Gemini API. The database lookup helper resolves common CRM concepts such as customers, leads, quotations, orders, installations, tickets, products and serials.

This is database-context-augmented prompting and deterministic lookup logic; the repository does not implement a vector database or embedding-based retrieval pipeline. For production use, move provider credentials and model calls behind a server-side service rather than exposing a `VITE_` key in browser code.

### ElevenLabs voice path

The web voice interface uses the ElevenLabs React SDK for the conversational voice experience. The backend contains `/api/voice/token` and `/api/voice/webhook` routes intended to support session setup and post-call lead ingestion. Verify the deployed agent configuration, token exchange and webhook authentication before relying on this as a production telephony integration.

### Mobile API URL

Set `EXPO_PUBLIC_API_URL` to the API base URL reachable from the target device. Emulator networking differs from physical-device networking; use the appropriate reachable address.

## 11. Demo walkthrough

For a coherent review, follow one customer journey instead of navigating unrelated screens. The seed builder defines a guided demo-customer profile in `src/data/seed.ts` (Rahul Sharma, residential property in Pune, a ₹3,200 monthly bill and a requested 3 kW on-grid system). The source labels this profile as a guided demo customer definition; it is not guaranteed to exist in every runtime mode until the appropriate demo flow creates or loads it.

Suggested reviewer journey:

1. **Customer enquiry:** submit an enquiry with contact, site, bill and system requirements.
2. **CRM:** open the lead and inspect the customer/site relationship, source and status.
3. **Survey:** review assessment data and feasibility status.
4. **Quotation:** inspect the quotation and component-level BOM.
5. **Order/payment:** inspect the sales order and payment information.
6. **Inventory/dispatch:** inspect stock, dispatch and serial-number records.
7. **Technician:** open a job and show checklist, progress and available evidence interactions.
8. **Handover:** inspect the signature component or installation completion flow, where configured.
9. **Asset Passport:** open an installation passport, QR code and document views.
10. **After-sales:** verify a known serial number and inspect or create a service ticket.
11. **Director view:** finish with pending work, open service cases and financial indicators.

For a live demonstration, prepare and verify the required customer, order, installation and serial-number records beforehand. Do not assume that a record created in a browser-local demo store automatically appears in PostgreSQL or on a separate mobile runtime. Verify the exact runtime and data path you will present.

## 12. Engineering decisions and business rules

### Domain modelling

The shared web domain types explicitly model customers, sites, leads, surveys, quotations, sales orders, payments, products, inventory units, reservations, movements, dispatches, installations, warranties, service tickets and replacements. These types and relationships describe the business lifecycle and provide a consistent language across the web modules.

### Business-rule examples

The repository contains domain logic beyond basic create/read/update/delete screens. Examples include:

- Reuse a customer record when a new enquiry matches an existing phone number.
- Detect duplicate enquiries using phone/email matching.
- Reject a lead update that would assign a phone number already belonging to a different customer.
- Reject non-positive payments, overpayments and payment records without a reference.
- Validate all BOM lines before a full kit reservation; do not reserve a partial kit when an item is short.
- Calculate uncovered stock shortages and group purchase requests by supplier in the web domain service.
- Validate that a service ticket's customer belongs to the selected installation.
- Validate that a supplied serial is installed at the selected installation.
- Require technician assignment before recording a diagnosis in the web service logic.
- Require a positive estimate for chargeable repair and place the ticket into a customer-approval state.
- Avoid duplicate warranty creation for the same serial during backend dispatch warranty automation.

### Database migrations

Flyway migrations are versioned under `Backend/src/main/resources/db/migration`. The migration sequence documents the evolution of the relational schema across leads, surveys, users/customers/sites, demo data, products/quotations, orders/inventory/dispatches, warranties/installations/service and follow-up schema changes.

### API and security foundation

The backend contains Spring Security configuration, JWT token utilities and an authentication filter, role definitions, DTOs, validation dependencies and a global exception handler. Review route-level authorization and tenant/customer data isolation before production deployment; the presence of a security module alone does not establish that every deployment policy is complete.

## 13. Tests

Backend test classes are present for application context/startup, health, lead, survey, quotation, dispatch, warranty/service and director dashboard/voice behavior under:

```text
Backend/src/test/java/com/visionx/sunflow/
```

Run the backend test suite from the backend directory:

```bash
cd Backend
mvn test
```

Run the web production build from the repository root:

```bash
npm run build
```

These commands are the project's verification entry points. A passing local build/test run should be recorded from the exact commit being submitted; this README does not imply that CI has passed for every environment.

## 14. Current implementation boundaries

We prefer an accurate description of what the code does today over overstating production readiness.

1. **Web demo mode and API mode are different.** `src/services/apiClient.ts` selects API mode when `VITE_SUNFLOW_API_URL` is set. Otherwise, domain services use a local browser store persisted in localStorage. Demo-mode persistence is not backend persistence.
2. **Assistant pathways are distinct.** The public assistant page labels the chat as a scripted demo. The assistant service contains an optional Gemini execution path when a key is configured. The separate voice interface uses ElevenLabs. The Spring Boot `AssistantController` currently returns keyword/rule-based replies.
3. **Gemini key exposure.** A `VITE_GEMINI_API_KEY` is compiled into client-side application code. This is acceptable only for a controlled prototype key with appropriate restrictions; production model calls should be proxied through a backend service with server-side secret management.
4. **Voice backend token/webhook hardening.** The current voice token controller returns a generated session-like identifier and agent ID; it should not be represented as a verified provider-issued ephemeral credential without completing the actual provider token exchange. The webhook handler accepts an optional signature header; signature verification and replay protection should be added before production use.
5. **API parity is not complete for every web domain action.** Some web service functions call endpoints for stock reservation/procurement and detailed service-ticket assignment/diagnosis/estimate decisions, while the current backend controllers expose a narrower set of operations for those modules. Test each action in API mode and align controller/service contracts before claiming complete end-to-end backend persistence.
6. **Mobile local and remote state differ.** The mobile app contains local storage and fallback/demo behavior. Its job, checklist and photo interactions should be tested for the target platform to distinguish locally stored changes from data successfully synchronized to the backend.
7. **Director cost model is indicative.** `ProfitabilityAnalyticsEngine` currently estimates hardware cost as 68% of revenue and labour cost as 12% of revenue. These are fixed modeled assumptions, not actual job-level accounting derived from purchase invoices, BOM consumption and technician timesheets.
8. **Warranty terms are category-based defaults.** The backend automation service documents 25 years for modules, 5 years for inverters and 1 year for BOS/structure. Actual coverage must follow the selected manufacturer's terms, product SKU and customer contract.
9. **Subsidy and tax values are implemented assumptions.** Validate government subsidy eligibility, scheme rules, GST treatment and pricing against current official rules and commercial agreements before using the calculations in a real quotation.
10. **Third-party integrations need deployment configuration.** The existence of a UI or API integration point does not itself prove a production SMS provider, official subsidy portal, payment gateway or telephony account is configured and operational.

These boundaries are important because SunPower 360 has both prototype/demo workflows and backend modules. A production rollout should have a verified end-to-end contract for every customer, inventory, installation and after-sales action.

## 15. Roadmap

The next engineering steps are focused on making the complete lifecycle more consistent, auditable and production-ready:

- Move Gemini model calls and provider secrets behind server-side endpoints.
- Complete provider-issued ElevenLabs session credential exchange; verify webhook signatures and prevent replayed events.
- Align every web service endpoint with a backend controller/service contract, especially inventory reservation, procurement and full service-ticket state transitions.
- Define a robust mobile synchronization contract with retry handling, idempotency and conflict resolution.
- Replace fixed director cost assumptions with a job-cost ledger using actual procurement cost, consumed BOM quantities, labour/time entries, travel and after-sales cost.
- Add immutable audit events for dispatch, serial assignment, installation completion, signature capture and warranty changes.
- Add end-to-end tests for enquiry-to-service workflows against PostgreSQL.
- Add role/permission tests for sensitive endpoints and verify customer-level data isolation.
- Validate subsidy rules, tax rates, product pricing and warranty terms against current official, supplier and contractual sources.
- Add production observability, structured logs, backups, deployment profiles and secret management.

---

## Why this approach matters

A solar installer does not operate through isolated screens. It operates through a chain of decisions and hand-offs:

**Enquiry → Qualification → Survey → Quotation/BOM → Order/Payment → Inventory/Dispatch → Installation → Asset Passport/Warranty → Service → Management visibility.**

SunPower 360 is organized around that chain. Its central value is the continuity of customer, site, order and equipment information across teams and over the long life of a solar installation.

**Vision X — connecting every stage of the solar business lifecycle.**
