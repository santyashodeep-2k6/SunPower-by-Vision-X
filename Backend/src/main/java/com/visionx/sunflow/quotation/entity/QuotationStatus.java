package com.visionx.sunflow.quotation.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Lifecycle states of an engineering Quotation.
 * Enforces the Survey Gate requirement:
 * Cannot transition to SENT/APPROVED if survey is not APPROVED.
 */
public enum QuotationStatus {
    DRAFT,
    PENDING_SURVEY_APPROVAL,
    APPROVED,
    SENT,
    ACCEPTED,
    REJECTED;

    @JsonValue
    public String toJson() {
        return switch (this) {
            case DRAFT -> "Draft";
            case PENDING_SURVEY_APPROVAL -> "Awaiting Response";
            case APPROVED -> "Draft";
            case SENT -> "Sent";
            case ACCEPTED -> "Accepted";
            case REJECTED -> "Rejected";
        };
    }

    @JsonCreator
    public static QuotationStatus fromString(String value) {
        if (value == null || value.isBlank()) return DRAFT;
        String clean = value.trim().toUpperCase().replace("-", "_").replace(" ", "_");
        for (QuotationStatus s : values()) {
            if (s.name().equalsIgnoreCase(clean)) return s;
        }
        if (clean.contains("DRAFT")) return DRAFT;
        if (clean.contains("ACCEPT")) return ACCEPTED;
        if (clean.contains("REJECT")) return REJECTED;
        if (clean.contains("SENT")) return SENT;
        if (clean.contains("AWAIT") || clean.contains("PENDING")) return PENDING_SURVEY_APPROVAL;
        return DRAFT;
    }
}
