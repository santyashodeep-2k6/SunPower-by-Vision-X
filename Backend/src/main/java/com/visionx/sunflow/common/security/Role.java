package com.visionx.sunflow.common.security;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * =============================================================================
 * ODOO HACKATHON 24-HR — ROLE DEFINITIONS (RBAC)
 * =============================================================================
 * Defines the 7 distinct authorization roles representing business departments:
 * 
 * 1. ADMIN     - Executive dashboard, approvals, system configuration, audit logs
 * 2. SALES     - Lead qualification, customer proposals, survey scheduling, quotes
 * 3. SURVEYOR  - Rooftop technical assessment, azimuth/tilt, shadow feasibility
 * 4. INVENTORY - Warehouse management, stock allocation, barcode serial validation
 * 5. INSTALLER - Field technicians, job clock-in, safety checklists, customer sign-off
 * 6. SERVICE   - Helpdesk tickets, fault diagnostics, warranty adjudication
 * 7. CUSTOMER  - Restricted customer portal (view own assets, approve quotes, raise tickets)
 */
public enum Role {
    ADMIN,
    SALES,
    SURVEYOR,
    INVENTORY,
    INSTALLER,
    SERVICE,
    CUSTOMER;

    @JsonValue
    public String toJson() {
        return this.name().toLowerCase();
    }

    @JsonCreator
    public static Role fromString(String value) {
        if (value == null || value.isBlank()) return CUSTOMER;
        for (Role r : values()) {
            if (r.name().equalsIgnoreCase(value.trim())) return r;
        }
        return CUSTOMER;
    }

    public String getAuthority() {
        return "ROLE_" + this.name();
    }
}

