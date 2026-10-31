package com.visionx.sunflow.survey.dto;

import com.visionx.sunflow.survey.ElectricalConnection;
import com.visionx.sunflow.survey.RoofType;
import com.visionx.sunflow.survey.ShadingCondition;
import com.visionx.sunflow.survey.Survey;
import com.visionx.sunflow.survey.SurveyFeasibility;
import com.visionx.sunflow.survey.SurveyStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SurveyResponse(
        UUID id,
        UUID leadId,
        String customerName,
        String customerPhone,
        String customerEmail,
        String surveyorName,
        String surveyorPhone,
        Instant scheduledAt,
        Instant completedAt,
        String siteAddress,
        SurveyStatus status,
        RoofType roofType,
        BigDecimal usableRoofAreaSqft,
        ShadingCondition shadingCondition,
        ElectricalConnection electricalConnection,
        BigDecimal sanctionedLoadKw,
        BigDecimal recommendedCapacityKw,
        SurveyFeasibility feasibility,
        String assessmentNotes,
        String schedulingNotes,
        Instant createdAt,
        Instant updatedAt
) {
    public static SurveyResponse from(Survey survey) {
        return new SurveyResponse(
                survey.getId(),
                survey.getLead() != null ? survey.getLead().getId() : null,
                survey.getLead() != null ? survey.getLead().getFullName() : null,
                survey.getLead() != null ? survey.getLead().getPhone() : null,
                survey.getLead() != null ? survey.getLead().getEmail() : null,
                survey.getSurveyorName(),
                survey.getSurveyorPhone(),
                survey.getScheduledAt(),
                survey.getCompletedAt(),
                survey.getSiteAddress(),
                survey.getStatus(),
                survey.getRoofType(),
                survey.getUsableRoofAreaSqft(),
                survey.getShadingCondition(),
                survey.getElectricalConnection(),
                survey.getSanctionedLoadKw(),
                survey.getRecommendedCapacityKw(),
                survey.getFeasibility(),
                survey.getAssessmentNotes(),
                survey.getSchedulingNotes(),
                survey.getCreatedAt(),
                survey.getUpdatedAt()
        );
    }
}
