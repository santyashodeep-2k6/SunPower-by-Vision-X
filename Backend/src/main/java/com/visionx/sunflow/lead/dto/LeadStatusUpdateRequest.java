package com.visionx.sunflow.lead.dto;

import com.visionx.sunflow.lead.LeadStatus;
import jakarta.validation.constraints.NotNull;

public record LeadStatusUpdateRequest(
        @NotNull(message = "Status is required")
        LeadStatus status
) {}
