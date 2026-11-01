# SunFlow 360 — Hackathon Judge Q&A Defense Master

This document contains categorized questions that technical judges frequently ask at hackathons, along with concise, high-impact spoken answers (20–45 seconds) grounded in the actual codebase.

---

## Category 1: Architecture & Technology Choice

### Q1: "Why did you build the backend in Spring Boot instead of Node.js or Python?"
> **Spoken Answer (30s)**:  
> *"In rooftop solar operations, we deal with financial billing, multi-step contractor milestones, inventory serialization, and statutory government subsidy calculations. We chose **Spring Boot 3.3.5 with Java 21** because of its strict type safety, rock-solid transactional integrity (`@Transactional`), and mature Domain-Driven Design patterns. Spring Data JPA with Hibernate gives us explicit foreign-key and check-constraint enforcement that prevents data corruption during complex sales-to-dispatch workflows."*

### Q2: "How is the communication structured between your React frontend and Spring Boot backend?"
> **Spoken Answer (25s)**:  
> *"We use a clean, decoupled REST architecture. The Spring Boot backend runs on port 8081 with stateless JWT authentication, and the React 19 Vite client communicates over asynchronous fetch calls with Bearer tokens. We configured fine-grained CORS beans in `SecurityConfig` to restrict origin access to our frontend domain while permitting preflight options and credential exchange."*

---

## Category 2: Domain Logic & The "Survey Gate"

### Q3: "What is your proudest backend domain invariant?"
> **Spoken Answer (35s)**:  
> *"Our proudest invariant is the **Survey Gate** in `QuotationService.java`. In rooftop solar, sales teams often commit pricing to customers before assessing the roof, which causes massive financial losses when unexpected shading or structural issues arise. In our backend, the quotation finalization endpoint programmatically checks the linked site survey. If the survey is not explicitly in `APPROVED` status, the backend rejects the transaction with an `IllegalStateException` and returns HTTP 400. You cannot legally send or accept an unverified solar quote in SunFlow 360."*

### Q4: "How does your Bill of Materials (BOM) sizing engine work?"
> **Spoken Answer (35s)**:  
> *"Our `BOMCalculationEngine` uses deterministic engineering rules rather than guesswork. When a user requests a 3 kW system, the engine derives the exact number of 540W Mono PERC modules using $\lceil (kW \times 1000) / 540 \rceil$—giving exactly 6 panels (3,240 Wp). It matches the correct 3 kW on-grid inverter, sizes 45 meters of UV-resistant DC cabling, attaches the mounting structure, adds the ACDB box, calculates the composite 13.8% Indian Solar GST, and applies the official ₹78,000 PM Surya Ghar Central subsidy."*

---

## Category 3: AI Integration vs Deterministic Logic

### Q5: "Where did you use AI in the backend, and why didn't you use an LLM for the BOM calculation?"
> **Spoken Answer (40s)**:  
> *"We made a deliberate architectural decision: **never use an LLM for legal, financial, or structural math where hallucinations cause physical or financial failure**. For the Bill of Materials, GST taxation, and government subsidies, we use a deterministic Java calculation engine. Where we did use AI is in our Operations Assistant (`AssistantController`), where we leverage language models for conversational CRM inquiry parsing, context summarization, and natural language query routing across our operational database."*

---

## Category 4: Database & Data Integrity

### Q6: "Why did you use Flyway instead of letting Hibernate automatically generate tables with `ddl-auto: update`?"
> **Spoken Answer (30s)**:  
> *"Using `ddl-auto: update` in an enterprise or hackathon environment is dangerous because it can cause silent schema mutations, column drops, or unexpected data loss. By using **Flyway migrations (V1 through V11)**, our database schema is fully version-controlled in Git. Every table creation, index addition, and foreign-key check is repeatable, auditable, and identical across development, H2 integration tests, and production PostgreSQL."*

### Q7: "How do you handle hardware serialization in the warehouse?"
> **Spoken Answer (35s)**:  
> *"Every solar module, inverter, and battery has a unique physical barcode tracked in our `inventory_items` table. In `InventoryService`, a warehouse dispatch cannot be confirmed unless the scanned serials correspond to active, `AVAILABLE` units in our Pune depot. Once scanned, the unit status transitions atomically to `DISPATCHED`. This prevents double-dispatching, eliminates counterfeit hardware swaps, and creates an audit trail for the 25-year warranty lifecycle."*

---

## Category 5: Security & Performance

### Q8: "How does your authentication and authorization work?"
> **Spoken Answer (30s)**:  
> *"We implemented stateless JWT authentication using `jjwt 0.12.5`. User credentials are encrypted using `BCryptPasswordEncoder` with 10 salt rounds. Every incoming request passes through our `JwtAuthenticationFilter`, which verifies the HMAC-SHA256 signature and populates the Spring `SecurityContextHolder`. We also enabled `@EnableMethodSecurity` to allow fine-grained `@PreAuthorize` role enforcement on financial and approval endpoints."*

### Q9: "What happens when an unexpected error or validation failure occurs?"
> **Spoken Answer (25s)**:  
> *"We have a centralized `@RestControllerAdvice` in `GlobalExceptionHandler.java`. It catches `MethodArgumentNotValidException` and extracts field-level validation errors into clean JSON payloads. It maps domain invariant exceptions (`IllegalStateException`) to `400 Bad Request` and missing entities to `404 Not Found`, ensuring the frontend always receives clean, structured error responses instead of generic 500 errors."*

