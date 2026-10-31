package com.visionx.sunflow.quotation.repository;

import com.visionx.sunflow.quotation.entity.Quotation;
import com.visionx.sunflow.quotation.entity.QuotationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuotationRepository extends JpaRepository<Quotation, String> {
    Optional<Quotation> findByQuoteNumber(String quoteNumber);
    List<Quotation> findByLeadId(String leadId);
    List<Quotation> findBySurveyId(String surveyId);
    List<Quotation> findByStatus(QuotationStatus status);
}

