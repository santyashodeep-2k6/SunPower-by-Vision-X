package com.visionx.sunflow.survey;

import com.visionx.sunflow.common.exception.ResourceNotFoundException;
import com.visionx.sunflow.lead.Lead;
import com.visionx.sunflow.lead.LeadRepository;
import com.visionx.sunflow.lead.LeadStatus;
import com.visionx.sunflow.survey.dto.SurveyAssessmentUpdateRequest;
import com.visionx.sunflow.survey.dto.SurveyCreateRequest;
import com.visionx.sunflow.survey.dto.SurveyResponse;
import com.visionx.sunflow.survey.dto.SurveyStatusUpdateRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class SurveyService {

    private final SurveyRepository surveyRepository;
    private final LeadRepository leadRepository;

    public SurveyService(SurveyRepository surveyRepository, LeadRepository leadRepository) {
        this.surveyRepository = surveyRepository;
        this.leadRepository = leadRepository;
    }

    @Transactional
    public SurveyResponse createSurvey(SurveyCreateRequest request) {
        Lead lead = leadRepository.findById(request.leadId())
                .orElseThrow(() -> new ResourceNotFoundException("Lead", request.leadId()));

        Survey survey = new Survey();
        survey.setLead(lead);
        survey.setSurveyorName(request.surveyorName());
        survey.setSurveyorPhone(request.surveyorPhone());
        survey.setScheduledAt(request.scheduledAt());
        survey.setSiteAddress(request.siteAddress() != null ? request.siteAddress() : lead.getAddress());
        survey.setSchedulingNotes(request.notes());
        survey.setStatus(SurveyStatus.SCHEDULED);

        Survey saved = surveyRepository.save(survey);

        lead.setStatus(LeadStatus.SURVEY_SCHEDULED);
        leadRepository.save(lead);

        return SurveyResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public Page<SurveyResponse> getSurveys(
            SurveyStatus status,
            String surveyorName,
            UUID leadId,
            Pageable pageable
    ) {
        Page<Survey> page;

        if (leadId != null && status != null) {
            page = surveyRepository.findByLeadIdAndStatus(leadId, status, pageable);
        } else if (leadId != null) {
            page = surveyRepository.findByLeadId(leadId, pageable);
        } else if (status != null && surveyorName != null && !surveyorName.isBlank()) {
            page = surveyRepository.findByStatusAndSurveyorNameContainingIgnoreCase(status, surveyorName, pageable);
        } else if (status != null) {
            page = surveyRepository.findByStatus(status, pageable);
        } else if (surveyorName != null && !surveyorName.isBlank()) {
            page = surveyRepository.findBySurveyorNameContainingIgnoreCase(surveyorName, pageable);
        } else {
            page = surveyRepository.findAll(pageable);
        }

        return page.map(SurveyResponse::from);
    }

    @Transactional(readOnly = true)
    public SurveyResponse getSurveyById(UUID id) {
        Survey survey = surveyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Survey", id));
        return SurveyResponse.from(survey);
    }

    @Transactional(readOnly = true)
    public List<SurveyResponse> getSurveysByLeadId(UUID leadId) {
        if (!leadRepository.existsById(leadId)) {
            throw new ResourceNotFoundException("Lead", leadId);
        }
        return surveyRepository.findByLeadIdOrderByScheduledAtDesc(leadId)
                .stream()
                .map(SurveyResponse::from)
                .toList();
    }

    @Transactional
    public SurveyResponse updateAssessment(UUID id, SurveyAssessmentUpdateRequest request) {
        Survey survey = surveyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Survey", id));

        // Terminal surveys cannot be modified
        if (survey.getStatus() == SurveyStatus.CANCELLED || survey.getStatus() == SurveyStatus.REJECTED) {
            throw new IllegalArgumentException("Cannot update assessment for a cancelled or rejected survey.");
        }

        if (request.roofType() != null) {
            survey.setRoofType(request.roofType());
        }
        if (request.usableRoofAreaSqft() != null) {
            survey.setUsableRoofAreaSqft(request.usableRoofAreaSqft());
        }
        if (request.shadingCondition() != null) {
            survey.setShadingCondition(request.shadingCondition());
        }
        if (request.electricalConnection() != null) {
            survey.setElectricalConnection(request.electricalConnection());
        }
        if (request.sanctionedLoadKw() != null) {
            survey.setSanctionedLoadKw(request.sanctionedLoadKw());
        }
        if (request.recommendedCapacityKw() != null) {
            survey.setRecommendedCapacityKw(request.recommendedCapacityKw());
        }
        if (request.feasibility() != null) {
            survey.setFeasibility(request.feasibility());
        }
        if (request.assessmentNotes() != null) {
            survey.setAssessmentNotes(request.assessmentNotes());
        }

        // If completeSurvey is requested, perform validation and state transition
        if (Boolean.TRUE.equals(request.completeSurvey())) {
            if (survey.getRoofType() == null || survey.getRecommendedCapacityKw() == null || survey.getFeasibility() == null) {
                throw new IllegalArgumentException(
                        "Cannot complete survey without roofType, recommendedCapacityKw, and feasibility."
                );
            }
            validateStatusTransition(survey.getStatus(), SurveyStatus.COMPLETED);
            survey.setStatus(SurveyStatus.COMPLETED);
            survey.setCompletedAt(Instant.now());
        }

        Survey updated = surveyRepository.save(survey);
        return SurveyResponse.from(updated);
    }

    @Transactional
    public SurveyResponse updateStatus(UUID id, SurveyStatusUpdateRequest request) {
        Survey survey = surveyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Survey", id));

        SurveyStatus targetStatus = request.status();
        validateStatusTransition(survey.getStatus(), targetStatus);

        survey.setStatus(targetStatus);
        if (targetStatus == SurveyStatus.COMPLETED) {
            survey.setCompletedAt(Instant.now());
        }

        Survey updated = surveyRepository.save(survey);
        return SurveyResponse.from(updated);
    }

    /**
     * Validates permitted status transitions:
     * - SCHEDULED -> IN_PROGRESS, CANCELLED, RESCHEDULED
     * - IN_PROGRESS -> COMPLETED, CANCELLED, RESCHEDULED
     * - RESCHEDULED -> SCHEDULED, CANCELLED
     * - COMPLETED -> APPROVED, REJECTED
     * - APPROVED, REJECTED, CANCELLED are terminal states
     */
    private void validateStatusTransition(SurveyStatus current, SurveyStatus next) {
        if (current == next) {
            return;
        }

        boolean valid = switch (current) {
            case SCHEDULED -> Set.of(SurveyStatus.IN_PROGRESS, SurveyStatus.CANCELLED, SurveyStatus.RESCHEDULED).contains(next);
            case IN_PROGRESS -> Set.of(SurveyStatus.COMPLETED, SurveyStatus.CANCELLED, SurveyStatus.RESCHEDULED).contains(next);
            case RESCHEDULED -> Set.of(SurveyStatus.SCHEDULED, SurveyStatus.CANCELLED).contains(next);
            case COMPLETED -> Set.of(SurveyStatus.APPROVED, SurveyStatus.REJECTED).contains(next);
            case APPROVED, REJECTED, CANCELLED -> false;
        };

        if (!valid) {
            throw new IllegalArgumentException(
                    "Invalid status transition from " + current + " to " + next
            );
        }
    }
}
