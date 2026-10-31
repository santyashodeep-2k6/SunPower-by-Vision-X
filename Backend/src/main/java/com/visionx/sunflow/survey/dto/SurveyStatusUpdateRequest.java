package com.visionx.sunflow.survey.dto;

import com.visionx.sunflow.survey.SurveyStatus;
import jakarta.validation.constraints.NotNull;

public record SurveyStatusUpdateRequest(
        @NotNull(message = "Status is required")
        SurveyStatus status
) {}
