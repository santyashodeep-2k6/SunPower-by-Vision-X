# SunFlow 360 — Page Test Matrix

This matrix documents the verification results for every route, layout, and view in the SunFlow 360 application across public, staff operations, and customer portal workspaces.

---

## Complete Route Verification Table

| Page / Route | Page loads | UI tested | Interactions tested | API tested | Responsive | Result |
|---|---|---|---|---|---|---|
| `/` (Homepage) | ✓ PASS | ✓ PASS | Navigation, hero CTAs, scroll spy, glass cards, leaf parallax | ✓ N/A (Static + floating AI) | ✓ PASS (Desktop, tablet, 390px mobile) | **PASS** |
| `/solutions` | ✓ PASS | ✓ PASS | Auto-redirects to `/#solutions` anchor | ✓ N/A | ✓ PASS | **PASS** |
| `/how-it-works` | ✓ PASS | ✓ PASS | Auto-redirects to `/#how-it-works` anchor | ✓ N/A | ✓ PASS | **PASS** |
| `/services` | ✓ PASS | ✓ PASS | Auto-redirects to `/#services` anchor | ✓ N/A | ✓ PASS | **PASS** |
| `/about` | ✓ PASS | ✓ PASS | Auto-redirects to `/#about` anchor | ✓ N/A | ✓ PASS | **PASS** |
| `/contact` | ✓ PASS | ✓ PASS | Auto-redirects to `/#about` contact section | ✓ N/A | ✓ PASS | **PASS** |
| `/calculator` | ✓ PASS | ✓ PASS | Auto-redirects to `/assistant` calculator | ✓ N/A | ✓ PASS | **PASS** |
| `/enquiry` | ✓ PASS | ✓ PASS | 4-step stepper, input validation, duplicate phone check, submit | ✓ `POST /api/enquiries` | ✓ PASS (Fluid form stack) | **PASS** |
| `/assistant` | ✓ PASS | ✓ PASS | Quick reply pills, slot prompts, ElevenLabs voice toggle, live transcript | ✓ `POST /api/assistant/reply` | ✓ PASS | **PASS** |
| `/login` | ✓ PASS | ✓ PASS | Persona card selection, phone login, remember-me, role redirection | ✓ `POST /api/v1/auth/login` | ✓ PASS | **PASS** |
| `/passport` | ✓ PASS | ✓ PASS | Asset lookup search, sample passport selector | ✓ `GET /api/v1/passports/public` | ✓ PASS | **PASS** |
| `/passport/:reference` | ✓ PASS | ✓ PASS | QR code generation, verified serials, warranty status, specs | ✓ `GET /api/v1/passports/public/{ref}` | ✓ PASS | **PASS** |
| `/app` | ✓ PASS | ✓ PASS | Role-based router redirection to appropriate role home | ✓ `GET /api/users` | ✓ PASS | **PASS** |
| `/app/dashboard` | ✓ PASS | ✓ PASS | Pipeline conversion stats, Recharts bars & pies, quick actions | ✓ `GET /api/leads`, `/api/surveys` | ✓ PASS (Grid 12-col to 1-col) | **PASS** |
| `/app/leads` | ✓ PASS | ✓ PASS | Lead status tabs, search debounce, CSV download, new lead modal | ✓ `GET /api/leads`, `POST /api/leads` | ✓ PASS (Horizontal scroll table) | **PASS** |
| `/app/leads/:id` | ✓ PASS | ✓ PASS | Overview, AI summary regeneration, schedule survey modal, status dropdown | ✓ `GET /api/leads/{id}`, `POST /assign` | ✓ PASS | **PASS** |
| `/app/conversations` | ✓ PASS | ✓ PASS | Conversation filter tabs, chat history thread, agent reply box | ✓ `GET /api/conversations` | ✓ PASS (Split pane collapse) | **PASS** |
| `/app/surveys` | ✓ PASS | ✓ PASS | Survey status filters, surveyor workload badges, row navigation | ✓ `GET /api/surveys` | ✓ PASS | **PASS** |
| `/app/surveys/:id` | ✓ PASS | ✓ PASS | Technical inputs, photo uploader, notes, submit for approval, approve/reject | ✓ `POST /api/surveys/{id}/photos`, `/notes`, `/submit`, `/approve` | ✓ PASS | **PASS** |
| `/app/quotations` | ✓ PASS | ✓ PASS | Quotation search, status badges, create quotation action | ✓ `GET /api/quotations` | ✓ PASS | **PASS** |
| `/app/quotations/:id` | ✓ PASS | ✓ PASS | Interactive BOM, pricing breakdown, tax/subsidy, mark sent, mark accepted | ✓ `GET /api/quotations/{id}`, `POST /api/quotations` | ✓ PASS | **PASS** |
| `/app/orders` | ✓ PASS | ✓ PASS | Sales order pipeline, total vs paid progress bars, open detail | ✓ `GET /api/sales-orders` | ✓ PASS | **PASS** |
| `/app/orders/:id` | ✓ PASS | ✓ PASS | Milestone timeline, payment record modal, customer address card | ✓ `GET /api/sales-orders/{id}`, `POST /api/payments` | ✓ PASS | **PASS** |
| `/app/purchases` | ✓ PASS | ✓ PASS | Purchase orders list, supplier catalogue, create PO modal, receive items | ✓ `GET /api/purchase-orders`, `POST /receive` | ✓ PASS | **PASS** |
| `/app/inventory` | ✓ PASS | ✓ PASS | Product catalogue, stock by warehouse, available units, serial list | ✓ `GET /api/products`, `/inventory/units` | ✓ PASS | **PASS** |
| `/app/dispatches` | ✓ PASS | ✓ PASS | Dispatch queue, pending vs fulfilled tabs, create dispatch modal | ✓ `GET /api/dispatches` | ✓ PASS | **PASS** |
| `/app/dispatches/:id` | ✓ PASS | ✓ PASS | Barcode scan simulation, serial number validation, confirm dispatch, deliver | ✓ `GET /api/dispatches/{id}`, `POST /confirm`, `POST /deliver` | ✓ PASS | **PASS** |
| `/app/installations` | ✓ PASS | ✓ PASS | Pipeline list, crew workload cards, create assignment modal | ✓ `GET /api/installations` | ✓ PASS | **PASS** |
| `/app/installations/:id` | ✓ PASS | ✓ PASS | Hardware serial verification, commissioning test results, completion photos | ✓ `GET /api/installations/{id}`, `POST /complete` | ✓ PASS | **PASS** |
| `/app/technician` | ✓ PASS | ✓ PASS | Mobile-friendly checklist, start/stop timesheet timers, job status | ✓ `GET /api/installations` | ✓ PASS (Touch target optimized) | **PASS** |
| `/app/warranties` | ✓ PASS | ✓ PASS | Serial search, warranty status badges (Active/Expiring/Expired), customer link | ✓ `GET /api/warranties` | ✓ PASS | **PASS** |
| `/app/service-tickets` | ✓ PASS | ✓ PASS | Ticket queue, priority filters, create ticket modal with serial validation | ✓ `GET /api/service-tickets`, `POST /create` | ✓ PASS | **PASS** |
| `/app/service-tickets/:id` | ✓ PASS | ✓ PASS | Diagnosis notes, warranty adjudicator, estimate approval, complete repair | ✓ `GET /api/service-tickets/{id}`, `POST /diagnosis`, `/close` | ✓ PASS | **PASS** |
| `/app/reports` | ✓ PASS | ✓ PASS | Period filter (today/week/month/custom), profitability charts, project margin drawer | ✓ `GET /api/sales-orders`, `/api/payments`, `/api/analytics/dashboard` | ✓ PASS | **PASS** |
| `/app/users` | ✓ PASS | ✓ PASS | Staff directory, role filters, user active/inactive toggle, create user modal | ✓ `GET /api/users`, `POST /users` | ✓ PASS | **PASS** |
| `/app/settings` | ✓ PASS | ✓ PASS | Organization profile, net metering tariffs, pricing settings form, save | ✓ `POST /api/settings` | ✓ PASS | **PASS** |
| `/portal` | ✓ PASS | ✓ PASS | Customer home, solar generation summary, live stage tracker, quick contact | ✓ `GET /api/customers/{id}`, `/installations` | ✓ PASS | **PASS** |
| `/portal/installations` | ✓ PASS | ✓ PASS | Step-by-step progress timeline from survey to DISCOM meter sync | ✓ `GET /api/installations` | ✓ PASS | **PASS** |
| `/portal/documents` | ✓ PASS | ✓ PASS | Downloadable PDF previews: Quotation, Sales Agreement, Invoices | ✓ `GET /api/quotations`, `/api/sales-orders` | ✓ PASS | **PASS** |
| `/portal/assets` | ✓ PASS | ✓ PASS | Registered solar modules, inverter serials, warranty certificate viewer | ✓ `GET /api/warranties` | ✓ PASS | **PASS** |
| `/portal/service` | ✓ PASS | ✓ PASS | Log new service ticket form, active ticket status, technician notes | ✓ `GET /api/service-tickets`, `POST /service-tickets` | ✓ PASS | **PASS** |

---

## Summary Statistics

- **Total Routes Evaluated**: 41
- **Routes Passing All Tests**: 41 (100%)
- **Routes Failing**: 0 (0%)
- **Responsive Layout Verification**: 100% compliant across 1440px desktop, 1024px tablet, and 390px mobile viewports.
