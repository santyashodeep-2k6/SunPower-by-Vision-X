package com.visionx.sunflow.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SurveyRepository extends JpaRepository<Survey, UUID> {

    Page<Survey> findByLeadId(UUID leadId, Pageable pageable);

    Page<Survey> findByStatus(SurveyStatus status, Pageable pageable);

    Page<Survey> findBySurveyorNameContainingIgnoreCase(String surveyorName, Pageable pageable);

    Page<Survey> findByLeadIdAndStatus(UUID leadId, SurveyStatus status, Pageable pageable);

    Page<Survey> findByStatusAndSurveyorNameContainingIgnoreCase(SurveyStatus status, String surveyorName, Pageable pageable);

    List<Survey> findByLeadIdOrderByScheduledAtDesc(UUID leadId);

    @Query("SELECT s FROM Survey s WHERE " +
           "(:status IS NULL OR s.status = :status) AND " +
           "(:leadId IS NULL OR s.lead.id = :leadId) AND " +
           "(:surveyor IS NULL OR LOWER(s.surveyorName) LIKE LOWER(CONCAT('%', :surveyor, '%')))")
    Page<Survey> findWithFilters(
            @Param("status") SurveyStatus status,
            @Param("leadId") UUID leadId,
            @Param("surveyor") String surveyor,
            Pageable pageable
    );
}
