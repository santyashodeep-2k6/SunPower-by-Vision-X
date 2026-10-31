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
        if (clean.contains("NEW")) return NEW;
        if (clean.contains("CONTACT")) return CONTACTED;
        if (clean.contains("QUALIF")) return QUALIFIED;
        if (clean.contains("DISQUAL") || clean.contains("LOST")) return LOST;
        if (clean.contains("WON") || clean.contains("CONVERT")) return WON;
        return NEW;
    }
}
