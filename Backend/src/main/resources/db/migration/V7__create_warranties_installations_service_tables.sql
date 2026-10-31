-- =============================================================================
-- V7: Create Warranties, Installations, and Service Tickets Tables
-- Odoo Hackathon 24-hr Core Architecture
-- Supports:
--   - Acceptance Test 4: Warranty Automation (Auto-generated for each serial upon delivery)
--   - Acceptance Test 5: Installation & Repair (Active Warranty Covered ₹0 vs Expired Chargeable)
--   - Negative Test: Prevent crew double-booking
--   - Negative Test: Do not close repair ticket before customer confirmation
-- =============================================================================

CREATE TABLE warranties (
    id VARCHAR(36) PRIMARY KEY,
    warranty_number VARCHAR(50) NOT NULL UNIQUE,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    customer_id VARCHAR(36),
    order_id VARCHAR(36) REFERENCES sales_orders(id) ON DELETE SET NULL,
    term_months INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, VOID
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE installation_jobs (
    id VARCHAR(36) PRIMARY KEY,
    job_number VARCHAR(50) NOT NULL UNIQUE,
    order_id VARCHAR(36) NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    crew_name VARCHAR(100) NOT NULL,
    scheduled_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    checklist_completed BOOLEAN NOT NULL DEFAULT FALSE,
    customer_signature VARCHAR(255),
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE service_tickets (
    id VARCHAR(36) PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id VARCHAR(36),
    serial_number VARCHAR(100) NOT NULL,
    issue_description TEXT NOT NULL,
    warranty_covered BOOLEAN NOT NULL DEFAULT FALSE,
    chargeable_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    customer_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, RESOLVED, CLOSED
    resolution_notes TEXT,
    closed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_warranties_serial ON warranties(serial_number);
CREATE INDEX idx_installation_crew_date ON installation_jobs(crew_name, scheduled_date);
CREATE INDEX idx_tickets_serial ON service_tickets(serial_number);

