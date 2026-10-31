package com.visionx.sunflow.survey;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ShadingCondition {
    NO_SHADING,
    PARTIAL_SHADING,
    HEAVY_SHADING;

    @JsonValue
    public String toJson() {
        return switch (this) {
            case NO_SHADING -> "None";
            case PARTIAL_SHADING -> "Partial";
            case HEAVY_SHADING -> "Significant";
        };
    }

    @JsonCreator
    public static ShadingCondition fromString(String value) {
        if (value == null || value.isBlank()) return NO_SHADING;
        String clean = value.trim().toUpperCase().replace("-", "_").replace(" ", "_");
        for (ShadingCondition sc : values()) {
            if (sc.name().equalsIgnoreCase(clean)) return sc;
        }
        if (clean.contains("NONE") || clean.contains("MINIMAL") || clean.contains("NO")) return NO_SHADING;
        if (clean.contains("PARTIAL") || clean.contains("SOME") || clean.contains("MEDIUM")) return PARTIAL_SHADING;
        if (clean.contains("HEAVY") || clean.contains("SIGNIF") || clean.contains("HIGH")) return HEAVY_SHADING;
        return NO_SHADING;
    }
}
