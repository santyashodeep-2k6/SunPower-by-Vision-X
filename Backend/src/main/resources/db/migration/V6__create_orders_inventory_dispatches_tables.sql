-- =============================================================================
-- V6: Create Sales Orders, Payments, Inventory and Dispatch Tables
-- Odoo Hackathon 24-hr Core Architecture
-- Supports:
--   - Acceptance Test 3: Warehouse Control (Missing serial number blocks dispatch)
--   - Advance Payment Validation (At least 20% advance required to confirm order)
--   - Serial Number barcode uniqueness and product matching
-- =============================================================================

CREATE TABLE sales_orders (
    id VARCHAR(36) PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    quotation_id VARCHAR(36) REFERENCES quotations(id) ON DELETE SET NULL,
    customer_id VARCHAR(36),
    site_id VARCHAR(36),
    total_amount NUMERIC(12, 2) NOT NULL,
    advance_required NUMERIC(12, 2) NOT NULL,
    advance_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    outstanding_amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_ADVANCE', -- PENDING_ADVANCE, CONFIRMED, DISPATCHED, INSTALLED, COMPLETED, CANCELLED
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    payment_type VARCHAR(50) NOT NULL, -- ADVANCE, STAGE_2, FINAL
    payment_method VARCHAR(50) NOT NULL, -- UPI, NEFT, RTGS, CHEQUE, CASH
    payment_reference VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED', -- PENDING, COMPLETED, FAILED
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_items (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    warehouse_location VARCHAR(100) NOT NULL DEFAULT 'Pune Central Depot',
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, RESERVED, DISPATCHED, INSTALLED, DEFECTIVE
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dispatch_orders (
    id VARCHAR(36) PRIMARY KEY,
    dispatch_number VARCHAR(50) NOT NULL UNIQUE,
    order_id VARCHAR(36) NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, VALIDATED, DISPATCHED, DELIVERED
    dispatched_at TIMESTAMP,
    delivered_at TIMESTAMP,
    delivery_person VARCHAR(100),
    delivery_phone VARCHAR(20),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dispatch_items (
    id VARCHAR(36) PRIMARY KEY,
    dispatch_order_id VARCHAR(36) NOT NULL REFERENCES dispatch_orders(id) ON DELETE CASCADE,
    product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    serial_number VARCHAR(100), -- Must NOT be null when validating delivery!
    scanned_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_inventory_serial ON inventory_items(serial_number);
CREATE INDEX idx_dispatch_order ON dispatch_orders(order_id);

-- Seed Initial Inventory with Real Barcode Serials
INSERT INTO inventory_items (id, product_id, serial_number, warehouse_location, status, created_at, updated_at)
VALUES 
    ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444401', 'MOD-2024-PUN-001', 'Pune Central Depot', 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444401', 'MOD-2024-PUN-002', 'Pune Central Depot', 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('55555555-5555-5555-5555-555555555503', '44444444-4444-4444-4444-444444444401', 'MOD-2024-PUN-003', 'Pune Central Depot', 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('55555555-5555-5555-5555-555555555504', '44444444-4444-4444-4444-444444444401', 'MOD-2024-PUN-004', 'Pune Central Depot', 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('55555555-5555-5555-5555-555555555505', '44444444-4444-4444-4444-444444444401', 'MOD-2024-PUN-005', 'Pune Central Depot', 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('55555555-5555-5555-5555-555555555506', '44444444-4444-4444-4444-444444444401', 'MOD-2024-PUN-006', 'Pune Central Depot', 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('55555555-5555-5555-5555-555555555507', '44444444-4444-4444-4444-444444444402', 'INV-3KW-SN-99881', 'Pune Central Depot', 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('55555555-5555-5555-5555-555555555508', '44444444-4444-4444-4444-444444444403', 'INV-5KW-SN-44112', 'Pune Central Depot', 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

