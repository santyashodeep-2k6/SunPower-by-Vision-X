package com.visionx.sunflow.lead;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum LeadStatus {
    NEW,
    CONTACTED,
    QUALIFIED,
    DISQUALIFIED,
    CONVERTED,
    SURVEY_SCHEDULED,
    SURVEY_COMPLETED,
    QUOTATION_SENT,
    WON,
    LOST;

    @JsonCreator
    public static LeadStatus fromString(String value) {
        if (value == null || value.isBlank()) return NEW;
        String clean = value.trim().toUpperCase().replace("-", "_").replace(" ", "_");
        for (LeadStatus s : values()) {
            if (s.name().equalsIgnoreCase(clean)) {
                return s;
            }
        }
        if (clean.equals("NEW")) return NEW;
        if (clean.equals("CONTACTED") || clean.equals("CONTACT")) return CONTACTED;
        if (clean.equals("QUALIFIED") || clean.equals("QUALIF")) return QUALIFIED;
        if (clean.equals("DISQUALIFIED") || clean.equals("DISQUAL")) return DISQUALIFIED;
        if (clean.equals("CONVERTED") || clean.equals("CONVERT")) return CONVERTED;
        if (clean.equals("SURVEY_SCHEDULED") || clean.equals("SURVEY SCHEDULED")) return SURVEY_SCHEDULED;
        if (clean.equals("SURVEY_COMPLETED") || clean.equals("SURVEY COMPLETED")) return SURVEY_COMPLETED;
        if (clean.equals("QUOTATION_SENT") || clean.equals("QUOTATION SENT")) return QUOTATION_SENT;
        if (clean.equals("WON")) return WON;
        if (clean.equals("LOST")) return LOST;
        throw new IllegalArgumentException("Invalid lead status: " + value);
    }
}
