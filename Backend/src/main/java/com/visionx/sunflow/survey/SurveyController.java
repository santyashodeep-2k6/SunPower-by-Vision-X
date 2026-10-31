package com.visionx.sunflow.survey;

import com.visionx.sunflow.survey.dto.SurveyAssessmentUpdateRequest;
import com.visionx.sunflow.survey.dto.SurveyCreateRequest;
import com.visionx.sunflow.survey.dto.SurveyResponse;
import com.visionx.sunflow.survey.dto.SurveyStatusUpdateRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@Tag(name = "Surveys", description = "Site survey management and technical assessment endpoints")
public class SurveyController {

    private final SurveyService surveyService;

    public SurveyController(SurveyService surveyService) {
        this.surveyService = surveyService;
    }

    @PostMapping("/surveys")
    @Operation(summary = "Schedule a new site survey for a customer lead")
    public ResponseEntity<SurveyResponse> createSurvey(@Valid @RequestBody SurveyCreateRequest request) {
        SurveyResponse response = surveyService.createSurvey(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/surveys")
    @Operation(summary = "List surveys with optional status, surveyor, and lead filters")
    public ResponseEntity<Page<SurveyResponse>> getSurveys(
            @RequestParam(required = false) SurveyStatus status,
            @RequestParam(required = false) String surveyor,
            @RequestParam(required = false) UUID leadId,
            @PageableDefault(size = 20, sort = "scheduledAt", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        Page<SurveyResponse> response = surveyService.getSurveys(status, surveyor, leadId, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/surveys/{id}")
    @Operation(summary = "Get survey details by ID")
    public ResponseEntity<SurveyResponse> getSurveyById(@PathVariable UUID id) {
        SurveyResponse response = surveyService.getSurveyById(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/surveys/{id}/assessment")
    @Operation(summary = "Update technical survey assessment findings")
    public ResponseEntity<SurveyResponse> updateAssessment(
            @PathVariable UUID id,
            @Valid @RequestBody SurveyAssessmentUpdateRequest request
    ) {
        SurveyResponse response = surveyService.updateAssessment(id, request);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/surveys/{id}/status")
    @Operation(summary = "Update survey status with state transition validation")
    public ResponseEntity<SurveyResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody SurveyStatusUpdateRequest request
    ) {
        SurveyResponse response = surveyService.updateStatus(id, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping({"/surveys/{id}/approve", "/v1/surveys/{id}/approve"})
    @Operation(summary = "Approve site survey findings")
    public ResponseEntity<SurveyResponse> approveSurvey(@PathVariable UUID id) {
        return ResponseEntity.ok(surveyService.updateStatus(id, new SurveyStatusUpdateRequest(SurveyStatus.APPROVED)));
    }

    @PostMapping({"/surveys/{id}/reject", "/v1/surveys/{id}/reject"})
    @Operation(summary = "Reject site survey findings")
    public ResponseEntity<SurveyResponse> rejectSurvey(@PathVariable UUID id, @RequestBody(required = false) java.util.Map<String, String> body) {
        return ResponseEntity.ok(surveyService.updateStatus(id, new SurveyStatusUpdateRequest(SurveyStatus.REJECTED)));
    }

    @PostMapping({"/surveys/{id}/submit", "/v1/surveys/{id}/submit"})
    @Operation(summary = "Submit survey for technical review")
    public ResponseEntity<SurveyResponse> submitSurvey(@PathVariable UUID id) {
        return ResponseEntity.ok(surveyService.updateStatus(id, new SurveyStatusUpdateRequest(SurveyStatus.COMPLETED)));
    }

    @GetMapping("/leads/{leadId}/surveys")
    @Operation(summary = "Get all surveys associated with a specific lead")
    public ResponseEntity<List<SurveyResponse>> getSurveysByLead(@PathVariable UUID leadId) {
        List<SurveyResponse> response = surveyService.getSurveysByLeadId(leadId);
        return ResponseEntity.ok(response);
    }
}
