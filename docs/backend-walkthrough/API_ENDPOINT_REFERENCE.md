# SunFlow 360 — API Endpoint Reference

This reference documents the REST APIs exposed by the Spring Boot backend (`http://localhost:8081`).

---

## 1. Authentication & Session APIs (`/api/auth`)

| Method | Endpoint | Access | Request Body | Response Body | Description |
|---|---|---|---|---|---|
| `POST` | `/api/auth/login` | Public | `{ email, password }` | `{ token, user: { id, email, fullName, role } }` | Authenticates user credentials via `BCryptPasswordEncoder` and returns a signed HMAC-SHA256 JWT. |
| `POST` | `/api/auth/register` | Public | `{ email, password, fullName, role }` | `{ token, user }` | Registers a new user account with role assignment. |
| `GET` | `/api/auth/me` | Authenticated | *None* | `{ id, email, fullName, role }` | Returns the currently authenticated user's profile from the SecurityContext. |

---

## 2. Lead Management APIs (`/api/leads`)

| Method | Endpoint | Access | Request Body | Response Body | Description |
|---|---|---|---|---|---|
| `GET` | `/api/leads` | Authenticated / Public | *None* | `List<LeadResponse>` | Lists all leads, filterable by status (`NEW`, `CONTACTED`, `QUALIFIED`, `SURVEY_SCHEDULED`, `DISQUALIFIED`). |
| `POST` | `/api/leads` | Public | `{ fullName, phone, email, address, monthlyBill, propertyType, systemType }` | `LeadResponse` (HTTP 201) | Captures prospective solar lead inquiries from public portal or website forms. |
| `GET` | `/api/leads/{id}` | Authenticated | *None* | `LeadResponse` | Fetches details for a specific lead UUID. |
| `PATCH` | `/api/leads/{id}` | Authenticated | `{ status, estimatedCapacityKw, notes, assignedSalespersonId }` | `LeadResponse` | Updates lead status, sales representative, or estimated capacity. |
| `POST` | `/api/leads/{id}/qualify` | Authenticated | `{ isQualified, qualificationNotes }` | `LeadResponse` | Marks a lead as qualified and prepares it for site survey scheduling. |

---

## 3. Site Survey & Feasibility APIs (`/api/surveys`)

| Method | Endpoint | Access | Request Body | Response Body | Description |
|---|---|---|---|---|---|
| `GET` | `/api/surveys` | Authenticated | *None* | `List<SurveyResponse>` | Lists all site surveys with assigned surveyors and feasibility statuses. |
| `POST` | `/api/surveys` | Public / Auth | `{ leadId, scheduledDate, surveyorName, notes }` | `SurveyResponse` | Schedules a new on-site technical inspection. |
| `GET` | `/api/surveys/{id}` | Authenticated | *None* | `SurveyResponse` | Returns detailed survey data including shadow analysis, roof structure, and photo metadata. |
| `PATCH` | `/api/surveys/{id}` | Authenticated | `{ roofAreaSqFt, recommendedCapacityKw, roofType, shading, electricalSanctionLoad }` | `SurveyResponse` | Records site engineering assessments, measurements, and electrical connection parameters. |
| `POST` | `/api/surveys/{id}/approve` | Authenticated | `{ approvedBy, approvalNotes }` | `SurveyResponse` | **Survey Gate Trigger**: Transitions survey to `APPROVED`, unlocking quotation finalization and order creation. |

---

## 4. Quotations & BOM APIs (`/api/quotations`)

| Method | Endpoint | Access | Request Body | Response Body | Description |
|---|---|---|---|---|---|
| `GET` | `/api/quotations` | Authenticated | *None* | `List<QuotationResponse>` | Lists all customer quotations with BOM summaries and status (`DRAFT`, `SENT`, `ACCEPTED`, `REJECTED`). |
| `POST` | `/api/quotations` | Authenticated | `{ leadId, surveyId, packageId, capacityKw, systemType, propertyType }` | `QuotationResponse` | Generates a Bill of Materials (BOM) using `BOMCalculationEngine`, calculates PM Surya Ghar subsidy, and creates a draft quotation. |
| `GET` | `/api/quotations/{id}` | Authenticated | *None* | `QuotationResponse` | Returns quotation breakdown: line items (modules, inverters, cabling, structures), GST, discount, subsidy, net payable. |
| `PATCH` | `/api/quotations/{id}` | Authenticated | `{ discountAmount, notes, validityDays }` | `QuotationResponse` | Updates quotation pricing adjustments or terms. |
| `POST` | `/api/quotations/{id}/send` | Authenticated | *None* | `QuotationResponse` | **Enforces Survey Gate**: Checks if linked survey is `APPROVED`. If unapproved, throws `400 Bad Request`. If approved, transitions quote to `SENT`. |
| `POST` | `/api/quotations/{id}/accept` | Authenticated | *None* | `QuotationResponse` | Records customer acceptance and triggers Sales Order creation. |

---

## 5. Sales Orders & Payments APIs (`/api/orders`, `/api/payments`)

| Method | Endpoint | Access | Request Body | Response Body | Description |
|---|---|---|---|---|---|
| `GET` | `/api/orders` | Authenticated | *None* | `List<OrderResponse>` | Lists all active installation projects and contract milestones. |
| `POST` | `/api/orders` | Authenticated | `{ quotationId, customerId, advancePaid }` | `OrderResponse` | Creates a confirmed sales order from an accepted quotation. |
| `GET` | `/api/orders/{id}` | Authenticated | *None* | `OrderResponse` | Returns order details, installation milestones, and linked payments. |
| `PATCH` | `/api/orders/{id}` | Authenticated | `{ status, scheduledInstallDate, completionDate }` | `OrderResponse` | Transitions order milestone (`CONFIRMED`, `AWAITING_STOCK`, `INSTALLATION_READY`, `COMMISSIONED`). |
| `POST` | `/api/payments` | Authenticated | `{ orderId, amount, paymentMethod, referenceNumber, milestone }` | `PaymentResponse` | Records customer milestone payments (Deposit 20%, Material Dispatch 60%, Commissioning 20%). |

---

## 6. Inventory & Dispatch APIs (`/api/inventory`, `/api/dispatches`)

| Method | Endpoint | Access | Request Body | Response Body | Description |
|---|---|---|---|---|---|
| `GET` | `/api/inventory/products` | Authenticated | *None* | `List<ProductResponse>` | Lists catalog products with current stock counts and reorder thresholds. |
| `GET` | `/api/dispatches` | Authenticated | *None* | `List<DispatchResponse>` | Lists material dispatches to customer installation sites. |
| `POST` | `/api/dispatches` | Authenticated | `{ orderId, siteAddress, items: [{ productId, quantity }] }` | `DispatchResponse` | Allocates warehouse stock and prepares a material dispatch order. |
| `POST` | `/api/dispatches/{id}/confirm` | Authenticated | `{ scannedSerials: ["MOD-540-001", "MOD-540-002", "INV-3K-001"] }` | `DispatchResponse` | **Serial Invariant**: Validates scanned serial barcodes against warehouse inventory units and confirms dispatch. |

---

## 7. Warranty & Post-Commissioning APIs (`/api/warranties`, `/api/service-tickets`)

| Method | Endpoint | Access | Request Body | Response Body | Description |
|---|---|---|---|---|---|
| `GET` | `/api/warranties` | Authenticated | *None* | `List<WarrantyResponse>` | Lists 5-year workmanship warranties and 25-year panel performance warranties. |
| `POST` | `/api/service-tickets` | Authenticated / Public | `{ customerId, serialNumber, issueCategory, description, priority }` | `TicketResponse` | Raises customer service requests (inverter error, generation dip, physical damage). |
| `PATCH` | `/api/service-tickets/{id}` | Authenticated | `{ status, resolutionNotes, assignedTechnicianId }` | `TicketResponse` | Updates repair progress and records resolution metrics. |

---

## 8. AI Operations & Analytics APIs (`/api/assistant`, `/api/analytics`)

| Method | Endpoint | Access | Request Body | Response Body | Description |
|---|---|---|---|---|---|
| `POST` | `/api/assistant/reply` | Authenticated | `{ prompt, context }` | `{ reply, suggestedActions }` | AI Assistant agent providing operational answers and workflow shortcuts. |
| `GET` | `/api/analytics/director-kpis` | Authenticated | *None* | `DirectorKpiResponse` | Real-time executive dashboard KPIs (total revenue, pipeline conversion, active MW installed). |
| `GET` | `/api/health` | Public | *None* | `{ status: "UP", timestamp }` | Liveness health probe for uptime monitors and load balancers. |

