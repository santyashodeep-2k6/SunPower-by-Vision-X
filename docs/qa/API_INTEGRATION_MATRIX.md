# SunFlow 360 — API Integration Matrix

This matrix documents the backend integration status across all frontend service operations and Spring Boot REST controllers. Testing was conducted using live HTTP requests against `http://localhost:8081/api` backed by PostgreSQL (`sunflow_dev`).

---

## 1. REST Endpoint Integration Table

| Module | Endpoint | Method | Request Tested | Response Tested | Persistence Verified | Result |
|---|---|---|---|---|---|---|
| **Enquiries** | `/api/enquiries` | POST | Customer contact, location, monthly bill, system type | `201 Created` with generated `LeadResponse` and UUID | Yes — row persisted in `leads` & `customers` tables | **INTEGRATED** |
| **Leads** | `/api/leads` | GET | Pagination params `size=20`, `status`, `search` | `200 OK` (Spring Data `Page<LeadResponse>`) | Yes — reads directly from database | **INTEGRATED** |
| **Leads** | `/api/leads/{id}` | GET | Path variable UUID | `200 OK` with full customer & site details | Yes — reads record by primary key | **INTEGRATED** |
| **Leads** | `/api/leads/{id}` | PATCH | Map with updated customer phone, capacity, etc. | `200 OK` with updated fields | Yes — database row updated | **INTEGRATED** |
| **Leads** | `/api/leads/{id}/assign` | POST | Payload `{"userId": "UUID"}` | `200 OK` with assigned salesperson | Yes — `assigned_to` column persisted | **INTEGRATED** |
| **Leads** | `/api/leads/{id}/status` | POST / PATCH | Payload `{"status": "QUALIFIED"}` | `200 OK` with new enum state | Yes — updated in PostgreSQL | **INTEGRATED** |
| **Leads** | `/api/leads/{id}/notes` | POST | Payload `{"text": "Customer requested visit"}` | `200 OK` with updated notes list | Yes — saved to notes collection | **INTEGRATED** |
| **Leads** | `/api/leads/{id}/ai-summary` | POST | Empty payload (lead UUID in path) | `200 OK` with AI qualification summary | Yes — generated & cached | **INTEGRATED** |
| **Leads** | `/api/leads/{id}/surveys` | POST | Payload `{"surveyorId": "U-04", "scheduledAt": "..."}` | `201 Created` with new Survey record | Yes — linked to lead ID | **INTEGRATED** |
| **Surveys** | `/api/surveys` | GET | Optional status and surveyor filters | `200 OK` with list of scheduled/pending surveys | Yes — live database records | **INTEGRATED** |
| **Surveys** | `/api/surveys/{id}` | GET | Path variable survey UUID | `200 OK` with roof area, tilt, shading specs | Yes — retrieved by ID | **INTEGRATED** |
| **Surveys** | `/api/surveys/{id}/photos` | POST | Payload `{"url": "...", "caption": "Roof ridge"}` | `200 OK` with updated photo array | Yes — stored in TEXT JSON column | **INTEGRATED** |
| **Surveys** | `/api/surveys/{id}/notes` | POST | Payload `{"text": "Meter load adequate"}` | `200 OK` with updated technical notes | Yes — appended to survey record | **INTEGRATED** |
| **Surveys** | `/api/surveys/{id}/assign` | POST | Payload `{"surveyorId": "U-04"}` | `200 OK` with assigned surveyor | Yes — persisted in database | **INTEGRATED** |
| **Surveys** | `/api/surveys/{id}/submit` | POST | Technical assessment values | `200 OK` (status: `Pending Approval`) | Yes — transition persisted | **INTEGRATED** |
| **Surveys** | `/api/surveys/{id}/approve` | POST | Approval decision | `200 OK` (status: `Approved`) | Yes — enables quotation gate | **INTEGRATED** |
| **Quotations** | `/api/quotations` | POST | Payload `{"surveyId": "UUID"}` | `201 Created` with BOM items & quote number | Yes — created with items in DB | **INTEGRATED** |
| **Quotations** | `/api/quotations` | GET | List quotations | `200 OK` with all draft/sent quotes | Yes — read from DB | **INTEGRATED** |
| **Quotations** | `/api/quotations/{id}` | GET | Path variable quotation UUID | `200 OK` with pricing & subsidy details | Yes — read from DB | **INTEGRATED** |
| **Quotations** | `/api/quotations/{id}/send` | POST | Customer notification trigger | `200 OK` (status: `Sent`) | Yes — status updated | **INTEGRATED** |
| **Quotations** | `/api/quotations/{id}/accept` | POST | Customer acceptance confirmation | `200 OK` (status: `Accepted`) | Yes — unlocks order creation | **INTEGRATED** |
| **Orders** | `/api/sales-orders` | GET | List orders | `200 OK` with contract value & paid amount | Yes — read from DB | **INTEGRATED** |
| **Orders** | `/api/sales-orders` | POST | Payload with accepted quotation reference | `201 Created` with generated `SO-XXXX` | Yes — created in database | **INTEGRATED** |
| **Payments** | `/api/payments` | GET | List recorded transactions | `200 OK` with payment receipts | Yes — read from DB | **INTEGRATED** |
| **Payments** | `/api/payments` | POST | Payload with `salesOrderId`, `amount`, `reference` | `201 Created` with ledger entry | Yes — updates order paid status | **INTEGRATED** |
| **Inventory** | `/api/products` | GET | Catalog query | `200 OK` with 540W modules, inverters, cables | Yes — read from catalog table | **INTEGRATED** |
| **Inventory** | `/api/inventory/units` | GET | Hardware serial ledger | `200 OK` with available/allocated serial units | Yes — unit inventory verified | **INTEGRATED** |
| **Dispatches** | `/api/dispatches` | GET | Warehouse fulfillment queue | `200 OK` with dispatch orders | Yes — read from DB | **INTEGRATED** |
| **Dispatches** | `/api/dispatches/{id}/confirm` | POST | Verified serial numbers list | `200 OK` (status: `Dispatched`) | Yes — reserves stock & serials | **INTEGRATED** |
| **Dispatches** | `/api/dispatches/{id}/deliver` | POST | Delivery confirmation timestamp | `200 OK` (status: `Delivered`) | Yes — enables installation | **INTEGRATED** |
| **Installations** | `/api/installations` | GET | Rooftop installation projects | `200 OK` with active & completed jobs | Yes — read from DB | **INTEGRATED** |
| **Installations** | `/api/installations/{id}/complete` | POST | Commissioning test results & photos | `200 OK` (status: `Completed`) | Yes — triggers auto-warranties | **INTEGRATED** |
| **Warranties** | `/api/warranties` | GET | Active & expired hardware warranties | `200 OK` with serial coverage dates | Yes — read from DB | **INTEGRATED** |
| **Service Tickets** | `/api/service-tickets` | GET | Support and RMA tickets | `200 OK` with priority and status | Yes — read from DB | **INTEGRATED** |
| **Service Tickets** | `/api/service-tickets` | POST | Customer, serial, reported defect | `201 Created` with ticket number | Yes — persists new ticket | **INTEGRATED** |
| **Service Tickets** | `/api/service-tickets/{id}/close` | POST | Customer confirmation & closure | `200 OK` (status: `Closed`) | Yes — marked closed in DB | **INTEGRATED** |
| **Analytics** | `/api/analytics/dashboard` | GET | Executive revenue, cost & margin request | `200 OK` with calculated financial KPIs | Yes — live aggregation | **INTEGRATED** |
| **AI Assistant** | `/api/assistant/reply` | POST | Payload `{"text": "Tell me about subsidy"}` | `200 OK` with structured reply & quick replies | Yes — dynamic responses | **INTEGRATED** |
| **Voice Webhook** | `/api/voice/webhook` | POST | ElevenLabs post-call transcript payload | `200 OK` with parsed slots & qualification | Yes — updates lead/conversation | **INTEGRATED** |
| **Passports** | `/api/v1/passports/public/{ref}` | GET | Solar asset public lookup | `200 OK` with warranty & installation passport | Yes — read from DB | **INTEGRATED** |

---

## 2. Integration Classification

### A. Fully Integrated Modules
- **Public Enquiry Engine**: Submissions create dual records in PostgreSQL (`leads` and `customers`), returning clean references and instant duplicate detection.
- **AI Solar Assistant**: Conversational replies for tariffs, DISCOM net-metering rules, and PM Surya Ghar subsidies are answered dynamically by `AssistantController.java` with 200 OK responses.
- **Site Survey Operations**: Field photos, engineer observations, structural tilt/azimuth assessments, surveyor assignments, and supervisor approvals are fully backed by the database.
- **Quotation & BOM Engine**: Quotation creation derives system sizing, inverter models, structure count, and central subsidies directly from approved technical surveys.
- **Warranty Ledger & Asset Passport**: Hardware serials, manufacturer coverage terms, and digital passport verification operate over persistent database records.
- **Executive Analytics**: Director dashboard queries live financial metrics and job counts.

### B. Client-Assisted Hybrid Workflows (Clearly Identified Fallbacks)
- **Offline / Transient Network Mode**: When backend connectivity is temporarily interrupted, `src/services/core.ts` gracefully serves the last hydrated reactive snapshot from memory without crashing the UI, providing uninterrupted user experience.
- **Demo Seed Fixtures**: Seed datasets in `src/data/seed.ts` are explicitly tagged with `DemoBadge` indicators ("Demo reference", "Sample data") whenever simulated fixtures are rendered, adhering strictly to audit guidelines.

