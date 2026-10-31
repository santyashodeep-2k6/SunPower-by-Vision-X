package com.visionx.sunflow.lead;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum PropertyType {
    RESIDENTIAL,
    COMMERCIAL,
    INDUSTRIAL,
    INSTITUTIONAL,
    OTHER;

    @JsonValue
    public String toJson() {
        return switch (this) {
            case RESIDENTIAL -> "Residential";
            case COMMERCIAL -> "Commercial";
            case INDUSTRIAL -> "Industrial";
            case INSTITUTIONAL -> "Housing Society";
            case OTHER -> "Residential";
        };
    }

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
