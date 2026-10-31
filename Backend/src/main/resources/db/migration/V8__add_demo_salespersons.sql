-- =============================================================================
-- MIGRATION: V8__add_demo_salespersons.sql
-- =============================================================================
-- Adds dedicated sales consultants and managers for CRM lead allocation & demo

INSERT INTO users (id, username, email, password_hash, full_name, phone, role, active, created_at, updated_at)
VALUES 
    ('11111111-1111-1111-1111-111111111121', 'sales.vikram', 'vikram.joshi@sunflow360.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Vikram Joshi', '9822000002', 'SALES', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('11111111-1111-1111-1111-111111111122', 'sales.sneha', 'sneha.patil@sunflow360.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Sneha Patil', '9822000003', 'SALES', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('11111111-1111-1111-1111-111111111123', 'sales.amit', 'amit.verma@sunflow360.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Amit Verma', '9822000004', 'SALES', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('11111111-1111-1111-1111-111111111124', 'sales.kavita', 'kavita.deshmukh@sunflow360.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Kavita Deshmukh', '9822000005', 'SALES', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('11111111-1111-1111-1111-111111111125', 'sales.rohan', 'rohan.sharma@sunflow360.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Rohan Sharma', '9822000006', 'SALES', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

