package com.visionx.sunflow.survey;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum SurveyStatus {
    SCHEDULED,
    IN_PROGRESS,
    COMPLETED,
    APPROVED,
    REJECTED,
    CANCELLED,
    RESCHEDULED;

    @JsonValue
    public String toJson() {
        return switch (this) {
            case SCHEDULED -> "Scheduled";
            case IN_PROGRESS -> "In Progress";
            case COMPLETED -> "Pending Approval";
            case APPROVED -> "Approved";
            case REJECTED, CANCELLED -> "Rejected";
            case RESCHEDULED -> "Revisit Requested";
        };
    }

    @JsonCreator
    public static SurveyStatus fromString(String value) {
        if (value == null || value.isBlank()) return SCHEDULED;
        String clean = value.trim().toUpperCase().replace("-", "_").replace(" ", "_");
        for (SurveyStatus s : values()) {
            if (s.name().equalsIgnoreCase(clean)) return s;
        }
        if (clean.contains("PENDING") || clean.contains("COMPLET")) return COMPLETED;
        if (clean.contains("PROG")) return IN_PROGRESS;
        if (clean.contains("APPROV")) return APPROVED;
        if (clean.contains("REJECT") || clean.contains("CANCEL")) return REJECTED;
        if (clean.contains("REVISIT") || clean.contains("RESCHED")) return RESCHEDULED;
        return SCHEDULED;
    }
}
