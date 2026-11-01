# SunFlow 360 — Backend Gaps, Limitations & Production Roadmap

This document provides an honest, rigorous assessment of what is fully implemented and database-backed versus what is simulated for the hackathon demo, along with the production scaling roadmap.

---

## 1. What Is Fully Implemented & Production-Ready

1. **Domain Models & Persistence**:
   - Complete PostgreSQL database schema with 11 Flyway migrations.
   - True ACID relational integrity with cascading foreign keys and unique constraints.
2. **Business Domain Invariants**:
   - The **Survey Gate**: Hard programmatic barrier preventing unapproved quotation transitions.
   - The **BOM Calculation Engine**: Real mathematical formulas for module counts, inverter matching, composite 13.8% GST, and legal PM Surya Ghar subsidy brackets.
   - **Hardware Serialization**: Unique physical barcode tracking and warehouse dispatch invariants.
   - **Post-Commissioning Warranty**: Automatic 5-year warranty generation and date-based ticket coverage adjudication.
3. **Security & API Architecture**:
   - Stateless JWT authentication with BCrypt hashing.
   - Centralized exception mapping via `@RestControllerAdvice`.
   - Comprehensive test suite (40 Spring Boot unit/mock tests passing with zero failures).

---

## 2. What Is Heuristic / Simulated for the Hackathon Demo

| Feature | Current Hackathon Implementation | Real-World Production Architecture |
|---|---|---|
| **Payment Gateway** | Payments are stored in the database as verified transactions via `/api/payments`, but without real bank API credentials. | Integration with **Razorpay**, **Cashfree**, or **Stripe** using webhook HMAC signature verification and automated escrow releases. |
| **IoT Inverter Telemetry** | Daily generation and power output curves are calculated using standardized solar irradiance formulas. | Real-time **Modbus RTU / RS-485 / MQTT** telemetry stream ingestion via IoT gateway hardware on site. |
| **Satellite Roof Analysis** | Roof area and shading conditions are submitted via survey forms and stored in PostgreSQL. | Integration with **Google Solar API** or high-resolution drone orthomosaics with automated computer vision segmentation. |
| **DISCOM Net Metering Portal** | Net-metering application status is tracked internally via project milestones. | Direct EDI / API connection to state electricity distribution companies (e.g. MSEDCL, BESCOM, Tata Power). |

---

## 3. Production Scaling Roadmap (Answers for Judges)

If a judge asks: *"How would this backend handle 50,000 concurrent solar installations?"*

### Architecture Evolution:
1. **Asynchronous Message Streaming with Apache Kafka**:
   - High-frequency IoT generation metrics from thousands of rooftop inverters should be streamed into Kafka topics rather than direct synchronous HTTP writes to PostgreSQL.
2. **Distributed Cache with Redis**:
   - The product catalog (`products`), standard pricing packages, and session blacklist can be cached in Redis with a 15-minute TTL, offloading read pressure from PostgreSQL.
3. **Blob Storage for Survey Photos & Drone Scans**:
   - Survey site photos and CAD drawings currently referenced by URI would be stored in Amazon S3 or Google Cloud Storage with presigned upload URLs.
4. **Read Replicas & Connection Pooling**:
   - Use HikariCP connection pooling configured with PostgreSQL primary for write operations and two read replicas for customer analytics and reporting queries.

