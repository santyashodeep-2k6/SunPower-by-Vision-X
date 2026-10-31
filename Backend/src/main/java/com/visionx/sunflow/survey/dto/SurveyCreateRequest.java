package com.visionx.sunflow.survey.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public record SurveyCreateRequest(
        @NotNull(message = "Lead ID is required")
        UUID leadId,

        @NotBlank(message = "Surveyor name is required")
        @Size(max = 100, message = "Surveyor name must not exceed 100 characters")
        String surveyorName,

        @Size(max = 20, message = "Surveyor phone must not exceed 20 characters")
        String surveyorPhone,

        @NotNull(message = "Scheduled date/time is required")
        Instant scheduledAt,

        @Size(max = 500, message = "Site address must not exceed 500 characters")
        String siteAddress,

        @Size(max = 2000, message = "Notes must not exceed 2000 characters")
        String notes
) {}
