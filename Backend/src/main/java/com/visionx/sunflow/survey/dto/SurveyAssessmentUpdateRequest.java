package com.visionx.sunflow.survey.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.visionx.sunflow.survey.ElectricalConnection;
import com.visionx.sunflow.survey.RoofType;
import com.visionx.sunflow.survey.ShadingCondition;
import com.visionx.sunflow.survey.SurveyFeasibility;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record SurveyAssessmentUpdateRequest(
        @JsonAlias({"roofType", "roofStructure", "structure"})
        RoofType roofType,

        @DecimalMin(value = "0.0", message = "Usable roof area must be non-negative")
        @JsonAlias({"usableRoofAreaSqft", "roofArea", "areaSqft"})
        BigDecimal usableRoofAreaSqft,

        @JsonAlias({"shadingCondition", "shading"})
        ShadingCondition shadingCondition,

        @JsonAlias({"electricalConnection", "electricalSetup", "connection"})
        ElectricalConnection electricalConnection,

        @DecimalMin(value = "0.0", message = "Sanctioned load must be non-negative")
        @JsonAlias({"sanctionedLoadKw", "sanctionedLoad"})
        BigDecimal sanctionedLoadKw,

        @DecimalMin(value = "0.0", message = "Recommended capacity must be non-negative")
        @JsonAlias({"recommendedCapacityKw", "recommendedCapacity"})
        BigDecimal recommendedCapacityKw,

        @JsonAlias({"feasibility"})
        SurveyFeasibility feasibility,

        @Size(max = 2000, message = "Assessment notes must not exceed 2000 characters")
        @JsonAlias({"assessmentNotes", "notes"})
        String assessmentNotes,

        @JsonAlias({"completeSurvey", "complete"})
        Boolean completeSurvey,

        @JsonAlias({"orientation"})
        String orientation,

        @JsonAlias({"tilt"})
        BigDecimal tilt,

        @JsonAlias({"cableDistance"})
        BigDecimal cableDistance,

        @JsonAlias({"recommendedType"})
        String recommendedType,

        @JsonAlias({"electricalSetup"})
        String electricalSetup
) {
    public SurveyAssessmentUpdateRequest(
            RoofType roofType,
            BigDecimal usableRoofAreaSqft,
            ShadingCondition shadingCondition,
            ElectricalConnection electricalConnection,
            BigDecimal sanctionedLoadKw,
            BigDecimal recommendedCapacityKw,
            SurveyFeasibility feasibility,
            String assessmentNotes,
            Boolean completeSurvey
    ) {
        this(roofType, usableRoofAreaSqft, shadingCondition, electricalConnection,
                sanctionedLoadKw, recommendedCapacityKw, feasibility, assessmentNotes,
                completeSurvey, null, null, null, null, null);
    }
}
