-- =============================================================================
-- V5: Create Products, Quotations, and Quotation Items (BOM) Tables
-- Odoo Hackathon 24-hr Core Architecture
-- Supports:
--   - Acceptance Test 1: Survey Gate (Final quote blocked without Approved Survey)
--   - Acceptance Test 2: Package Automation (3 kW On-Grid loads correct BOM)
--   - Central PM Surya Ghar Subsidy Calculations
-- =============================================================================

CREATE TABLE products (
    id VARCHAR(36) PRIMARY KEY,
    sku VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- MODULE, INVERTER, STRUCTURE, BOS, BATTERY
    wattage INT,
    unit_price NUMERIC(12, 2) NOT NULL,
    unit_of_measure VARCHAR(20) NOT NULL DEFAULT 'UNIT',
    hsn_code VARCHAR(20),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quotations (
    id VARCHAR(36) PRIMARY KEY,
    quote_number VARCHAR(50) NOT NULL UNIQUE,
    lead_id VARCHAR(36),
    site_id VARCHAR(36),
    survey_id VARCHAR(36),
    capacity_kw NUMERIC(6, 2) NOT NULL,
    system_type VARCHAR(50) NOT NULL, -- ON_GRID, OFF_GRID, HYBRID
    base_amount NUMERIC(12, 2) NOT NULL,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 13.80, -- Composite Solar GST Rate in India (13.8% composite: 70% @ 12% + 30% @ 18%)
    gst_amount NUMERIC(12, 2) NOT NULL,
    gross_amount NUMERIC(12, 2) NOT NULL,
    subsidy_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- PM Surya Ghar Subsidy
    net_payable NUMERIC(12, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING_APPROVAL, APPROVED, SENT, ACCEPTED, REJECTED
    notes TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quotation_items (
    id VARCHAR(36) PRIMARY KEY,
    quotation_id VARCHAR(36) NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    product_id VARCHAR(36) REFERENCES products(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quotations_lead ON quotations(lead_id);
CREATE INDEX idx_quotations_survey ON quotations(survey_id);
CREATE INDEX idx_quotations_status ON quotations(status);

-- Seed Standard Solar Catalog Products
INSERT INTO products (id, sku, name, category, wattage, unit_price, unit_of_measure, hsn_code, active, created_at)
VALUES 
    ('44444444-4444-4444-4444-444444444401', 'MOD-540W-MONO', '540W Tier-1 Mono PERC Solar Module', 'MODULE', 540, 9500.00, 'PIECE', '85414011', TRUE, CURRENT_TIMESTAMP),
    ('44444444-4444-4444-4444-444444444402', 'INV-3KW-GRID', '3 kW High-Efficiency On-Grid Inverter', 'INVERTER', 3000, 28000.00, 'UNIT', '85044090', TRUE, CURRENT_TIMESTAMP),
    ('44444444-4444-4444-4444-444444444403', 'INV-5KW-GRID', '5 kW Smart On-Grid Solar Inverter', 'INVERTER', 5000, 39000.00, 'UNIT', '85044090', TRUE, CURRENT_TIMESTAMP),
    ('44444444-4444-4444-4444-444444444404', 'INV-10KW-GRID', '10 kW 3-Phase Commercial Solar Inverter', 'INVERTER', 10000, 68000.00, 'UNIT', '85044090', TRUE, CURRENT_TIMESTAMP),
    ('44444444-4444-4444-4444-444444444405', 'STR-GI-ELEVATED', 'Pre-Galvanized Elevated Roof Mounting Structure', 'STRUCTURE', NULL, 1800.00, 'KW_SET', '73089090', TRUE, CURRENT_TIMESTAMP),
    ('44444444-4444-4444-4444-444444444406', 'BOS-DC-CABLE-4MM', '4 sq mm UV-Resistant Dual-Core DC Solar Cable', 'BOS', NULL, 65.00, 'METER', '85444999', TRUE, CURRENT_TIMESTAMP),
    ('44444444-4444-4444-4444-444444444407', 'BOS-ACDB-40A', 'AC Distribution Box (ACDB) with SPD & MCB 40A', 'BOS', NULL, 4200.00, 'UNIT', '85371000', TRUE, CURRENT_TIMESTAMP),
    ('44444444-4444-4444-4444-444444444408', 'BOS-EARTH-KIT', 'Chemical Grounding & Earthing Electrodes Kit', 'BOS', NULL, 3500.00, 'SET', '85359000', TRUE, CURRENT_TIMESTAMP);

