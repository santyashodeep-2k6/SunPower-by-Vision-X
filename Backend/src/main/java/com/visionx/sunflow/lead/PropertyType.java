package com.visionx.sunflow.lead;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum PropertyType {
    RESIDENTIAL,
    COMMERCIAL,
    INDUSTRIAL,
    INSTITUTIONAL,
    OTHER;

    @JsonCreator
    public static PropertyType fromString(String value) {
        if (value == null || value.isBlank()) return RESIDENTIAL;
        String clean = value.trim().toUpperCase().replace("-", "_").replace(" ", "_");
        for (PropertyType type : values()) {
            if (type.name().equalsIgnoreCase(clean)) {
                return type;
            }
        }
        if (clean.contains("RESIDEN") || clean.contains("HOUSING")) return RESIDENTIAL;
        if (clean.contains("COMMERC")) return COMMERCIAL;
        if (clean.contains("INDUST")) return INDUSTRIAL;
        return OTHER;
    }
}
