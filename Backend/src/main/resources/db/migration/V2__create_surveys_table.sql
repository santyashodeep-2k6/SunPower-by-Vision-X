-- V2: Site Survey Management schema
-- Compatible with both PostgreSQL and H2 (PostgreSQL mode)
-- Enums are stored as VARCHAR and enforced at the JPA layer.
-- UUID generation is handled by JPA, not the database.

CREATE TABLE surveys (
    id                      UUID            PRIMARY KEY,
    lead_id                 UUID            NOT NULL,
    surveyor_name           VARCHAR(100)    NOT NULL,
    surveyor_phone          VARCHAR(20),
    scheduled_at            TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at            TIMESTAMP WITH TIME ZONE,
    site_address            VARCHAR(500),
    status                  VARCHAR(25)     NOT NULL DEFAULT 'SCHEDULED',
    roof_type               VARCHAR(30),
    usable_roof_area_sqft   NUMERIC(10,2)   CHECK (usable_roof_area_sqft IS NULL OR usable_roof_area_sqft > 0),
    shading_condition       VARCHAR(30),
    electrical_connection   VARCHAR(30),
    sanctioned_load_kw      NUMERIC(8,2)    CHECK (sanctioned_load_kw IS NULL OR sanctioned_load_kw > 0),
    recommended_capacity_kw NUMERIC(8,2)    CHECK (recommended_capacity_kw IS NULL OR recommended_capacity_kw > 0),
    feasibility             VARCHAR(30),
    assessment_notes        TEXT,
    scheduling_notes        TEXT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_surveys_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE INDEX idx_surveys_lead_id ON surveys(lead_id);
CREATE INDEX idx_surveys_status ON surveys(status);
CREATE INDEX idx_surveys_scheduled_at ON surveys(scheduled_at);
