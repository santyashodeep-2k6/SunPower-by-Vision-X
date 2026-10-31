package com.visionx.sunflow.survey.dto;

import com.visionx.sunflow.survey.ElectricalConnection;
import com.visionx.sunflow.survey.RoofType;
import com.visionx.sunflow.survey.ShadingCondition;
import com.visionx.sunflow.survey.SurveyFeasibility;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record SurveyAssessmentUpdateRequest(
        RoofType roofType,

        @Positive(message = "Usable roof area must be positive")
        BigDecimal usableRoofAreaSqft,

        ShadingCondition shadingCondition,

        ElectricalConnection electricalConnection,

        @Positive(message = "Sanctioned load must be positive")
        BigDecimal sanctionedLoadKw,

        @Positive(message = "Recommended capacity must be positive")
        BigDecimal recommendedCapacityKw,

        SurveyFeasibility feasibility,

        @Size(max = 2000, message = "Assessment notes must not exceed 2000 characters")
        String assessmentNotes,

        Boolean completeSurvey
) {}
