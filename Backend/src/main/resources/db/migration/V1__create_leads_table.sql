-- V1: Initial schema - Lead management
-- Compatible with both PostgreSQL and H2 (PostgreSQL mode)
-- Enums are stored as VARCHAR and enforced at the JPA layer.
-- UUID generation is handled by JPA, not the database.

CREATE TABLE leads (
    id                    UUID            PRIMARY KEY,
    full_name             VARCHAR(200)    NOT NULL,
    phone                 VARCHAR(20)     NOT NULL,
    email                 VARCHAR(255),
    address               VARCHAR(500),
    city                  VARCHAR(100),
    property_type         VARCHAR(30)     DEFAULT 'RESIDENTIAL',
    requested_capacity_kw NUMERIC(8,2),
    system_type           VARCHAR(20),
    monthly_bill          NUMERIC(10,2),
    roof_area_sqft        NUMERIC(10,2),
    preferred_language    VARCHAR(30),
    subsidy_interest      BOOLEAN         DEFAULT FALSE,
    channel               VARCHAR(20)     NOT NULL DEFAULT 'WEB_FORM',
    status                VARCHAR(20)     NOT NULL DEFAULT 'NEW',
    qualification_notes   TEXT,
    assigned_to           VARCHAR(100),
    created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leads_status ON leads (status);
CREATE INDEX idx_leads_channel ON leads (channel);
CREATE INDEX idx_leads_phone ON leads (phone);
CREATE INDEX idx_leads_created_at ON leads (created_at DESC);
