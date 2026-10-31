package com.visionx.sunflow.lead;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum SystemType {
    ON_GRID,
    OFF_GRID,
    HYBRID;

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
