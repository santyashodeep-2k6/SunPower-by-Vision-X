-- =============================================================================
-- V3: Users, Roles (RBAC), Customers, and Sites Schema
-- Odoo Hackathon 24-hr Core Architecture
-- Supports:
--   1. 7 Distinct Hackathon Roles (Admin, Sales, Surveyor, Inventory, Installer, Service, Customer)
--   2. Multi-site Customer Relationship Management
--   3. Foreign key associations linking Leads to verified Customers and Rooftop Sites
-- =============================================================================

-- Table: Users (Staff & Customer logins)
CREATE TABLE users (
    id                    UUID            PRIMARY KEY,
    username              VARCHAR(100)    NOT NULL UNIQUE,
    email                 VARCHAR(255)    NOT NULL UNIQUE,
    password_hash         VARCHAR(255)    NOT NULL,
    full_name             VARCHAR(200)    NOT NULL,
    phone                 VARCHAR(20),
    role                  VARCHAR(30)     NOT NULL,
    active                BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_email ON users (email);

-- Table: Customers
CREATE TABLE customers (
    id                    UUID            PRIMARY KEY,
    name                  VARCHAR(200)    NOT NULL,
    email                 VARCHAR(255),
    phone                 VARCHAR(20)     NOT NULL,
    company_name          VARCHAR(200),
    gst_number            VARCHAR(50),
    created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_phone ON customers (phone);
CREATE INDEX idx_customers_email ON customers (email);

-- Table: Sites (Physical installation premises)
CREATE TABLE sites (
    id                    UUID            PRIMARY KEY,
    customer_id           UUID            NOT NULL,
    property_type         VARCHAR(30)     NOT NULL DEFAULT 'RESIDENTIAL',
    address               VARCHAR(500)    NOT NULL,
    city                  VARCHAR(100)    NOT NULL,
    pin_code              VARCHAR(20),
    sanction_load_kw      NUMERIC(8,2),
    created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sites_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_sites_customer_id ON sites (customer_id);

-- Optional linkage on Leads to link CRM records to confirmed Customer & Site entities
ALTER TABLE leads ADD COLUMN customer_id UUID;
ALTER TABLE leads ADD COLUMN site_id UUID;
ALTER TABLE leads ADD CONSTRAINT fk_leads_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE leads ADD CONSTRAINT fk_leads_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL;

