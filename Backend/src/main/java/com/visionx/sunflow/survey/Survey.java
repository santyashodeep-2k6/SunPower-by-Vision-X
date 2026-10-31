package com.visionx.sunflow.survey;

import com.visionx.sunflow.lead.Lead;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "surveys")
public class Survey {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lead_id", nullable = false)
    private Lead lead;

    @Column(name = "surveyor_name", nullable = false, length = 100)
    private String surveyorName;

    @Column(name = "surveyor_phone", length = 20)
    private String surveyorPhone;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "site_address", length = 500)
    private String siteAddress;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private SurveyStatus status = SurveyStatus.SCHEDULED;

    @Enumerated(EnumType.STRING)
    @Column(name = "roof_type", length = 30)
    private RoofType roofType;

    @Column(name = "usable_roof_area_sqft", precision = 10, scale = 2)
    private BigDecimal usableRoofAreaSqft;

    @Enumerated(EnumType.STRING)
    @Column(name = "shading_condition", length = 30)
    private ShadingCondition shadingCondition;

    @Enumerated(EnumType.STRING)
    @Column(name = "electrical_connection", length = 30)
    private ElectricalConnection electricalConnection;

    @Column(name = "sanctioned_load_kw", precision = 8, scale = 2)
    private BigDecimal sanctionedLoadKw;

    @Column(name = "recommended_capacity_kw", precision = 8, scale = 2)
    private BigDecimal recommendedCapacityKw;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private SurveyFeasibility feasibility;

    @Column(name = "assessment_notes", columnDefinition = "TEXT")
    private String assessmentNotes;

    @Column(name = "scheduling_notes", columnDefinition = "TEXT")
    private String schedulingNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // Getters and Setters

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Lead getLead() {
        return lead;
    }

    public void setLead(Lead lead) {
        this.lead = lead;
    }

    public String getSurveyorName() {
        return surveyorName;
    }

    public void setSurveyorName(String surveyorName) {
        this.surveyorName = surveyorName;
    }

    public String getSurveyorPhone() {
        return surveyorPhone;
    }

    public void setSurveyorPhone(String surveyorPhone) {
        this.surveyorPhone = surveyorPhone;
    }

    public Instant getScheduledAt() {
        return scheduledAt;
    }

    public void setScheduledAt(Instant scheduledAt) {
        this.scheduledAt = scheduledAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }

    public String getSiteAddress() {
        return siteAddress;
    }

    public void setSiteAddress(String siteAddress) {
        this.siteAddress = siteAddress;
    }

    public SurveyStatus getStatus() {
        return status;
    }

    public void setStatus(SurveyStatus status) {
        this.status = status;
    }

    public RoofType getRoofType() {
        return roofType;
    }

    public void setRoofType(RoofType roofType) {
        this.roofType = roofType;
    }

    public BigDecimal getUsableRoofAreaSqft() {
        return usableRoofAreaSqft;
    }

    public void setUsableRoofAreaSqft(BigDecimal usableRoofAreaSqft) {
        this.usableRoofAreaSqft = usableRoofAreaSqft;
    }

    public ShadingCondition getShadingCondition() {
        return shadingCondition;
    }

    public void setShadingCondition(ShadingCondition shadingCondition) {
        this.shadingCondition = shadingCondition;
    }

    public ElectricalConnection getElectricalConnection() {
        return electricalConnection;
    }

    public void setElectricalConnection(ElectricalConnection electricalConnection) {
        this.electricalConnection = electricalConnection;
    }

    public BigDecimal getSanctionedLoadKw() {
        return sanctionedLoadKw;
    }

    public void setSanctionedLoadKw(BigDecimal sanctionedLoadKw) {
        this.sanctionedLoadKw = sanctionedLoadKw;
    }

    public BigDecimal getRecommendedCapacityKw() {
        return recommendedCapacityKw;
    }

    public void setRecommendedCapacityKw(BigDecimal recommendedCapacityKw) {
        this.recommendedCapacityKw = recommendedCapacityKw;
    }

    public SurveyFeasibility getFeasibility() {
        return feasibility;
    }

    public void setFeasibility(SurveyFeasibility feasibility) {
        this.feasibility = feasibility;
    }

    public String getAssessmentNotes() {
        return assessmentNotes;
    }

    public void setAssessmentNotes(String assessmentNotes) {
        this.assessmentNotes = assessmentNotes;
    }

    public String getSchedulingNotes() {
        return schedulingNotes;
    }

    public void setSchedulingNotes(String schedulingNotes) {
        this.schedulingNotes = schedulingNotes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
