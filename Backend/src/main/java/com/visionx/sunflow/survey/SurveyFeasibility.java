package com.visionx.sunflow.survey;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum SurveyFeasibility {
    FEASIBLE,
    FEASIBLE_WITH_CONDITIONS,
    NOT_FEASIBLE;

    @JsonValue
    public String toJson() {
        return switch (this) {
            case FEASIBLE -> "Feasible";
            case FEASIBLE_WITH_CONDITIONS -> "Feasible with Conditions";
            case NOT_FEASIBLE -> "Not Feasible";
        };
    }

    @JsonCreator
    public static SurveyFeasibility fromString(String value) {
        if (value == null || value.isBlank()) return FEASIBLE;
        String clean = value.trim().toUpperCase().replace("-", "_").replace(" ", "_");
        for (SurveyFeasibility sf : values()) {
            if (sf.name().equalsIgnoreCase(clean)) return sf;
        }
        if (clean.contains("NOT") || clean.contains("UNFEASIBLE")) return NOT_FEASIBLE;
        if (clean.contains("COND")) return FEASIBLE_WITH_CONDITIONS;
        return FEASIBLE;
    }
}
