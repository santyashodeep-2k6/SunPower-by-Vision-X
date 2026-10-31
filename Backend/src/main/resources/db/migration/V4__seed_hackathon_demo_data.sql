-- =============================================================================
-- V4: Seed Hackathon Demo Data
-- Odoo Hackathon 24-hr Core Architecture
-- Pre-populates:
--   1. Staff accounts across all 6 departments (Admin, Sales, Surveyor, Inventory, Installer, Service)
--   2. Customer portal accounts (Rahul Sharma, Priya Deshmukh)
--   3. Default password for all seed accounts: "password123" (BCrypt hashed)
-- =============================================================================

-- Seed Users (Default password: password123)
-- BCrypt: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

INSERT INTO users (id, username, email, password_hash, full_name, phone, role, active, created_at, updated_at)
VALUES 
    ('11111111-1111-1111-1111-111111111101', 'admin', 'admin@sunflow360.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Rajesh Nair', '9820011223', 'ADMIN', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('11111111-1111-1111-1111-111111111102', 'sales', 'sales@sunflow360.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Priya Sharma', '9820022334', 'SALES', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('11111111-1111-1111-1111-111111111103', 'surveyor', 'surveyor@sunflow360.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Vikram Joshi', '9820033445', 'SURVEYOR', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('11111111-1111-1111-1111-111111111104', 'inventory', 'inventory@sunflow360.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Anil Gaikwad', '9820044556', 'INVENTORY', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('11111111-1111-1111-1111-111111111105', 'installer', 'installer@sunflow360.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Arjun Patil', '9820055667', 'INSTALLER', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('11111111-1111-1111-1111-111111111106', 'service', 'service@sunflow360.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Deepak Shinde', '9820066778', 'SERVICE', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('11111111-1111-1111-1111-111111111107', 'rahul', 'rahul@gmail.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Rahul Sharma', '9876543210', 'CUSTOMER', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed Customers
INSERT INTO customers (id, name, email, phone, company_name, created_at, updated_at)
VALUES 
    ('22222222-2222-2222-2222-222222222201', 'Rahul Sharma', 'rahul@gmail.com', '9876543210', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('22222222-2222-2222-2222-222222222202', 'Priya Deshmukh', 'priya.deshmukh@gmail.com', '9819001234', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('22222222-2222-2222-2222-222222222203', 'Apex Manufacturing Ltd', 'procurement@apexind.in', '9833005544', 'Apex Manufacturing Ltd', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed Sites
INSERT INTO sites (id, customer_id, property_type, address, city, pin_code, sanction_load_kw, created_at, updated_at)
VALUES 
    ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'RESIDENTIAL', '14 Sunrise Bungalows, Baner Road', 'Pune', '411045', 5.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202', 'RESIDENTIAL', 'Flat 402, Green Meadows, Kothrud', 'Pune', '411038', 3.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222203', 'COMMERCIAL', 'Plot 45, MIDC Bhosari Industrial Area', 'Pune', '411026', 25.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

