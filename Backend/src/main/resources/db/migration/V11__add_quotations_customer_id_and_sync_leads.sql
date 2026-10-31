-- =============================================================================
-- V11: Add customer_id to quotations and auto-register leads as customers
-- =============================================================================

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_id VARCHAR(100);

-- Auto-register customers for all existing leads that do not yet have a record in customers table
INSERT INTO customers (id, name, phone, email, created_at, updated_at)
SELECT
    l.id,
    COALESCE(NULLIF(TRIM(l.full_name), ''), 'Customer'),
    COALESCE(NULLIF(TRIM(l.phone), ''), '0000000000'),
    l.email,
    l.created_at,
    l.updated_at
FROM leads l
WHERE NOT EXISTS (
    SELECT 1 FROM customers c WHERE c.id = l.id
);

-- Ensure sites exist for each registered customer from lead addresses
INSERT INTO sites (id, customer_id, property_type, address, city, pin_code, created_at, updated_at)
SELECT
    l.id,
    l.id,
    COALESCE(l.property_type::text, 'RESIDENTIAL'),
    COALESCE(NULLIF(TRIM(l.address), ''), 'Site Address'),
    COALESCE(NULLIF(TRIM(l.city), ''), 'Pune'),
    '411033',
    l.created_at,
    l.updated_at
FROM leads l
WHERE NOT EXISTS (
    SELECT 1 FROM sites s WHERE s.id = l.id
);

-- Link lead customer_id and site_id to the registered customer
UPDATE leads l
SET customer_id = l.id, site_id = l.id
WHERE l.customer_id IS NULL;

-- Backfill quotation customer_id to point to the registered customer ID
UPDATE quotations q
SET customer_id = COALESCE(
    (SELECT c.id::text FROM customers c WHERE c.id::text = q.lead_id LIMIT 1),
    q.lead_id
)
WHERE q.customer_id IS NULL;
