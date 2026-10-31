package com.visionx.sunflow.survey;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ElectricalConnection {
    SINGLE_PHASE,
    THREE_PHASE;

    @JsonValue
    public String toJson() {
        return switch (this) {
            case SINGLE_PHASE -> "Single Phase";
            case THREE_PHASE -> "3-Phase";
        };
    }

    @JsonCreator
    public static ElectricalConnection fromString(String value) {
        if (value == null || value.isBlank()) return SINGLE_PHASE;
        String clean = value.trim().toUpperCase().replace("-", "_").replace(" ", "_");
        for (ElectricalConnection ec : values()) {
            if (ec.name().equalsIgnoreCase(clean)) return ec;
        }
        if (clean.contains("3") || clean.contains("THREE")) return THREE_PHASE;
        if (clean.contains("1") || clean.contains("SINGLE")) return SINGLE_PHASE;
        return SINGLE_PHASE;
    }
}
