package com.visionx.sunflow.lead;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum SystemType {
    ON_GRID,
    OFF_GRID,
    HYBRID;

    @JsonValue
    public String toJson() {
        return switch (this) {
            case ON_GRID -> "On-Grid";
            case OFF_GRID -> "Off-Grid";
            case HYBRID -> "On-Grid";
        };
    }

    @JsonCreator
    public static SystemType fromString(String value) {
        if (value == null || value.isBlank()) return ON_GRID;
        String clean = value.trim().toUpperCase().replace("-", "_").replace(" ", "_");
        for (SystemType type : values()) {
            if (type.name().equalsIgnoreCase(clean)) {
                return type;
            }
        }
        if (clean.contains("OFF")) return OFF_GRID;
        if (clean.contains("HYB")) return HYBRID;
        return ON_GRID;
    }
}
