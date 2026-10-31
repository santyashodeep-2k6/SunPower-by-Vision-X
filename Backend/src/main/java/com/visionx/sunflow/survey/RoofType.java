package com.visionx.sunflow.survey;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum RoofType {
    RCC_FLAT,
    PITCHED_TILED,
    METAL_SHEET,
    GROUND_MOUNT,
    OTHER;

    @JsonValue
    public String toJson() {
        return switch (this) {
            case RCC_FLAT -> "RCC";
            case PITCHED_TILED -> "Tiled";
            case METAL_SHEET -> "Metal Sheet";
            case GROUND_MOUNT -> "Ground";
            case OTHER -> "Other";
        };
    }

    @JsonCreator
    public static RoofType fromString(String value) {
        if (value == null || value.isBlank()) return RCC_FLAT;
        String clean = value.trim().toUpperCase().replace("-", "_").replace(" ", "_");
        for (RoofType rt : values()) {
            if (rt.name().equalsIgnoreCase(clean)) return rt;
        }
        if (clean.contains("RCC") || clean.contains("FLAT") || clean.contains("CONCRETE")) return RCC_FLAT;
        if (clean.contains("TILE") || clean.contains("PITCH")) return PITCHED_TILED;
        if (clean.contains("SHEET") || clean.contains("METAL") || clean.contains("TIN")) return METAL_SHEET;
        if (clean.contains("GROUND")) return GROUND_MOUNT;
        return RCC_FLAT;
    }
}
