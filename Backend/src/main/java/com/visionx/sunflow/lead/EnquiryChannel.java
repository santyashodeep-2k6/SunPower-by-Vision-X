package com.visionx.sunflow.lead;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum EnquiryChannel {
    WEB_FORM,
    WHATSAPP,
    VOICE;

    @JsonCreator
    public static EnquiryChannel fromString(String value) {
        if (value == null || value.isBlank()) return WEB_FORM;
        String clean = value.trim().toUpperCase().replace("-", "_").replace(" ", "_");
        for (EnquiryChannel ch : values()) {
            if (ch.name().equalsIgnoreCase(clean)) {
                return ch;
            }
        }
        if (clean.contains("WEB") || clean.contains("SITE")) return WEB_FORM;
        if (clean.contains("WHATS")) return WHATSAPP;
        if (clean.contains("VOICE") || clean.contains("PHONE") || clean.contains("ASSIST")) return VOICE;
        return WEB_FORM;
    }
}
