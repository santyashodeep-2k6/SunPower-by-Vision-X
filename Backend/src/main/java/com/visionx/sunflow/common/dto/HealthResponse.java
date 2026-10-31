package com.visionx.sunflow.common.dto;

/**
 * Response payload for the health endpoint.
 */
public record HealthResponse(String application, String status) {

    public static HealthResponse up() {
        return new HealthResponse("SunFlow 360", "UP");
    }
}
