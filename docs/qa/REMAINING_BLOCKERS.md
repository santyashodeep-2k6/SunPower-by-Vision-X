# SunFlow 360 — Remaining Blockers & Developer Action Items

This document identifies all external dependencies, third-party credentials, and recommended architectural enhancements for production handoff.

---

## 1. External Third-Party Integrations & Credentials

### A. WhatsApp Cloud API / Twilio
- **Current Status**: Mocked in UI with realistic omnichannel transcript fixtures.
- **Blocker**: Production Meta WhatsApp Business API requires a verified Meta Business Account, WhatsApp Phone Number ID, and permanent System User Access Token.
- **Action Required by Team**:
  - Provision Meta WhatsApp Cloud API credentials in `Backend/src/main/resources/application.yml`.
  - Configure webhook endpoint `/api/v1/whatsapp/webhook` to ingest incoming customer chat messages directly into the `conversations` table.

### B. ElevenLabs Conversational AI Agent
- **Current Status**: `@elevenlabs/react` widget is integrated in `/assistant` with live transcript rendering.
- **Blocker**: Active voice calls require a live ElevenLabs Agent ID (`VITE_ELEVENLABS_AGENT_ID`).
- **Action Required by Team**:
  - Supply a valid `VITE_ELEVENLABS_AGENT_ID` in `.env` if live interactive voice calling is to be demonstrated during presentation. If absent, the interface falls back to text chat.

### C. SMS / OTP Gateway (Twilio / Fast2SMS)
- **Current Status**: Staff and customer login operates with one-click persona cards and simulated SMS notifications.
- **Action Required for Production**:
  - Integrate a domestic SMS gateway (DLT registered in India for PM Surya Ghar compliance) for customer OTP login and survey dispatch notifications.

---

## 2. Backend Enhancements for Full Enterprise Production

### A. Spring Data Page vs DTO Serialization
- **Observation**: Spring Boot logs display a benign warning: `Serializing PageImpl instances as-is is not supported... For a stable JSON structure, please use Spring Data's PagedModel`.
- **Recommendation**: Add `@EnableSpringDataWebSupport(pageSerializationMode = VIA_DTO)` to a configuration class in `Backend/src/main/java/com/visionx/sunflow/common/config/` for long-term API contract stability.

### B. Document PDF Generation Engine
- **Current Status**: PDF quotation and digital asset passport documents are rendered client-side using styled HTML printable views and QR canvas components.
- **Recommendation**: For formal corporate records, consider adding a backend PDF generation microservice (e.g. OpenPDF / iText or Puppeteer headless service) to output signed binary PDF files saved to S3/MinIO.

---

## 3. Database & Deployment Readiness

- **PostgreSQL Migrations**: Flyway migrations are up to date through `V10`. All columns (`site_id`, `lead_id`, `survey_id`, `photos`, `notes`) have sufficient width and constraints.
- **Environment Parity**: Ensure production environment sets `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, and `SPRING_DATASOURCE_PASSWORD` via environment variables rather than hardcoded defaults.

