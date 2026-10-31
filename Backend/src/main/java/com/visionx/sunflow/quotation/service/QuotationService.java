package com.visionx.sunflow.quotation.service;

import com.visionx.sunflow.common.exception.ResourceNotFoundException;
import com.visionx.sunflow.quotation.dto.QuotationCreateRequest;
import com.visionx.sunflow.quotation.dto.QuotationResponse;
import com.visionx.sunflow.quotation.entity.Quotation;
import com.visionx.sunflow.quotation.entity.QuotationStatus;
import com.visionx.sunflow.quotation.repository.QuotationRepository;
import com.visionx.sunflow.survey.Survey;
import com.visionx.sunflow.survey.SurveyRepository;
import com.visionx.sunflow.survey.SurveyStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

/**
 * =============================================================================
 * SERVICE: QuotationService
 * =============================================================================
 * Core engineering pricing, quotation management & Survey Gate invariant engine.
 * 
 * Hackathon Highlights:
 * - Acceptance Test 1 (Survey Gate):
 *   Validates that any attempt to send or finalize a quotation is blocked with
 *   an IllegalStateException unless the site survey has been APPROVED.
 * - Acceptance Test 2 (Package Automation):
 *   Delegates to BOMCalculationEngine to auto-load 540W modules, inverters,
 *   structures, and compute PM Surya Ghar subsidies.
 */
@Service
public class QuotationService {

    private final QuotationRepository quotationRepository;
    private final SurveyRepository surveyRepository;
    private final BOMCalculationEngine bomEngine;

    public QuotationService(
            QuotationRepository quotationRepository,
            SurveyRepository surveyRepository,
            BOMCalculationEngine bomEngine
    ) {
        this.quotationRepository = quotationRepository;
        this.surveyRepository = surveyRepository;
        this.bomEngine = bomEngine;
    }

    @Transactional
    public QuotationResponse createQuotation(QuotationCreateRequest request) {
        var calc = bomEngine.calculateBOM(request.capacityKw(), request.propertyType());

        Quotation q = new Quotation();
        q.setLeadId(request.leadId());
        q.setSiteId(request.siteId());
        q.setSurveyId(request.surveyId());
        q.setCapacityKw(request.capacityKw());
        q.setSystemType(request.systemType());
        q.setQuoteNumber(generateQuoteNumber());
        q.setBaseAmount(calc.baseAmount());
        q.setGstRate(calc.gstRate());
        q.setGstAmount(calc.gstAmount());
        q.setGrossAmount(calc.grossAmount());
        q.setSubsidyAmount(calc.subsidyAmount());
        q.setNetPayable(calc.netPayable());
        q.setStatus(QuotationStatus.DRAFT);
        q.setNotes(request.notes());

        calc.items().forEach(q::addItem);

        Quotation saved = quotationRepository.save(q);
        return QuotationResponse.fromEntity(saved);
    }

    /**
     * Acceptance Test 1 (Survey Gate):
     * Try sending a final quote before survey approval -> System blocks it.
     */
    @Transactional
    public QuotationResponse sendQuotation(String quotationId) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation", quotationId));

        if (quotation.getSurveyId() == null || quotation.getSurveyId().isBlank()) {
            throw new IllegalStateException("Survey Gate Violation: Cannot finalize or send quotation without an associated site survey.");
        }

        Survey survey = surveyRepository.findById(UUID.fromString(quotation.getSurveyId()))
                .orElseThrow(() -> new ResourceNotFoundException("Survey", quotation.getSurveyId()));

        if (survey.getStatus() != SurveyStatus.APPROVED) {
            throw new IllegalStateException(
                    "Survey Gate Violation: System blocked sending quotation. " +
                    "Site survey must be APPROVED before quotation can be dispatched. Current survey status is " + survey.getStatus()
            );
        }

        quotation.setStatus(QuotationStatus.SENT);
        quotation.setSentAt(Instant.now());
        Quotation saved = quotationRepository.save(quotation);
        return QuotationResponse.fromEntity(saved);
    }

    @Transactional
    public QuotationResponse acceptQuotation(String quotationId) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation", quotationId));
        quotation.setStatus(QuotationStatus.ACCEPTED);
        Quotation saved = quotationRepository.save(quotation);
        return QuotationResponse.fromEntity(saved);
    }

    @Transactional
    public QuotationResponse rejectQuotation(String quotationId, String reason) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation", quotationId));
        quotation.setStatus(QuotationStatus.REJECTED);
        if (reason != null && !reason.isBlank()) {
            quotation.setNotes(quotation.getNotes() != null ? quotation.getNotes() + " | Rejection: " + reason : "Rejection: " + reason);
        }
        Quotation saved = quotationRepository.save(quotation);
        return QuotationResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public QuotationResponse getQuotationById(String id) {
        return quotationRepository.findById(id)
                .map(QuotationResponse::fromEntity)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation", id));
    }

    @Transactional(readOnly = true)
    public List<QuotationResponse> getQuotationsByLead(String leadId) {
        return quotationRepository.findByLeadId(leadId).stream()
                .map(QuotationResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<QuotationResponse> getAllQuotations() {
        return quotationRepository.findAll().stream()
                .map(QuotationResponse::fromEntity)
                .toList();
    }

    private String generateQuoteNumber() {
        String period = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        long count = quotationRepository.count() + 1;
        return String.format("QT-%s-%04d", period, count);
    }
}

