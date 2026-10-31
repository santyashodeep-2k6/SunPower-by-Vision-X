package com.visionx.sunflow.survey.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.visionx.sunflow.survey.ElectricalConnection;
import com.visionx.sunflow.survey.RoofType;
import com.visionx.sunflow.survey.ShadingCondition;
import com.visionx.sunflow.survey.Survey;
import com.visionx.sunflow.survey.SurveyFeasibility;
import com.visionx.sunflow.survey.SurveyStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
        List<Map<String, Object>> photosList,
        List<Map<String, Object>> notesList,
        Instant createdAt,
        Instant updatedAt
) {
    @JsonProperty("surveyId")
    public String surveyId() {
        return id != null ? id.toString() : null;
    }

    @JsonProperty("reference")
    public String reference() {
        return id != null ? id.toString() : null;
    }

    @JsonProperty("customerId")
    public String customerId() {
        return leadId != null ? leadId.toString() : null;
    }

    @JsonProperty("siteId")
    public String siteId() {
        return leadId != null ? "site-" + leadId.toString() : null;
    }

    @JsonProperty("surveyorId")
    public String surveyorId() {
        return surveyorName != null ? surveyorName : "U-04";
    }

    @JsonProperty("photos")
    public List<Map<String, Object>> photos() {
        return photosList != null ? photosList : Collections.emptyList();
    }

    @JsonProperty("notes")
    public List<Map<String, Object>> notes() {
        if (notesList != null && !notesList.isEmpty()) {
            return notesList;
        }
        if (schedulingNotes != null && !schedulingNotes.isBlank()) {
            return List.of(Map.of(
                    "id", "srv-note-1",
                    "text", schedulingNotes,
                    "author", "Scheduler",
                    "authorName", "Scheduler",
                    "at", createdAt != null ? createdAt.toString() : Instant.now().toString()
            ));
        }
        return Collections.emptyList();
    }

    @JsonProperty("assessment")
    public Map<String, Object> assessment() {
        Map<String, Object> map = new HashMap<>();
        map.put("roofArea", usableRoofAreaSqft != null ? usableRoofAreaSqft : 0);
        map.put("orientation", "South");
        map.put("tilt", 18);
        map.put("shading", shadingCondition != null ? shadingCondition.toJson() : "None");
        map.put("roofStructure", roofType != null ? roofType.toJson() : "RCC");
        map.put("electricalSetup", electricalConnection != null ? electricalConnection.toJson() : "Single Phase");
        map.put("cableDistance", 20);
        map.put("recommendedCapacity", recommendedCapacityKw != null ? recommendedCapacityKw : 3);
        map.put("recommendedType", "On-Grid");
        return map;
    }

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
                survey.getPhotosList(),
                survey.getNotesList(),
                survey.getCreatedAt(),
                survey.getUpdatedAt()
        );
    }
}
