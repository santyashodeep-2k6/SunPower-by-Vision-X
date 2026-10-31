package com.visionx.sunflow.lead;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "leads")
public class Lead {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(length = 255)
    private String email;

    @Column(length = 500)
    private String address;

    @Column(length = 100)
    private String city;

    @Enumerated(EnumType.STRING)
    @Column(name = "property_type", length = 30)
    private PropertyType propertyType = PropertyType.RESIDENTIAL;

    @Column(name = "requested_capacity_kw", precision = 8, scale = 2)
    private BigDecimal requestedCapacityKw;

    @Enumerated(EnumType.STRING)
    @Column(name = "system_type", length = 20)
    private SystemType systemType;

    @Column(name = "monthly_bill", precision = 10, scale = 2)
    private BigDecimal monthlyBill;

    @Column(name = "roof_area_sqft", precision = 10, scale = 2)
    private BigDecimal roofAreaSqft;

    @Column(name = "preferred_language", length = 30)
    private String preferredLanguage;

    @Column(name = "subsidy_interest")
    private Boolean subsidyInterest = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EnquiryChannel channel = EnquiryChannel.WEB_FORM;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LeadStatus status = LeadStatus.NEW;

    @Column(name = "qualification_notes", columnDefinition = "TEXT")
    private String qualificationNotes;

    @Column(name = "assigned_to", length = 100)
    private String assignedTo;

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

    // Getters and setters

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public PropertyType getPropertyType() { return propertyType; }
    public void setPropertyType(PropertyType propertyType) { this.propertyType = propertyType; }

    public BigDecimal getRequestedCapacityKw() { return requestedCapacityKw; }
    public void setRequestedCapacityKw(BigDecimal requestedCapacityKw) { this.requestedCapacityKw = requestedCapacityKw; }

    public SystemType getSystemType() { return systemType; }
    public void setSystemType(SystemType systemType) { this.systemType = systemType; }

    public BigDecimal getMonthlyBill() { return monthlyBill; }
    public void setMonthlyBill(BigDecimal monthlyBill) { this.monthlyBill = monthlyBill; }

    public BigDecimal getRoofAreaSqft() { return roofAreaSqft; }
    public void setRoofAreaSqft(BigDecimal roofAreaSqft) { this.roofAreaSqft = roofAreaSqft; }

    public String getPreferredLanguage() { return preferredLanguage; }
    public void setPreferredLanguage(String preferredLanguage) { this.preferredLanguage = preferredLanguage; }

    public Boolean getSubsidyInterest() { return subsidyInterest; }
    public void setSubsidyInterest(Boolean subsidyInterest) { this.subsidyInterest = subsidyInterest; }

    public EnquiryChannel getChannel() { return channel; }
    public void setChannel(EnquiryChannel channel) { this.channel = channel; }

    public LeadStatus getStatus() { return status; }
    public void setStatus(LeadStatus status) { this.status = status; }

    public String getQualificationNotes() { return qualificationNotes; }
    public void setQualificationNotes(String qualificationNotes) { this.qualificationNotes = qualificationNotes; }

    public String getAssignedTo() { return assignedTo; }
    public void setAssignedTo(String assignedTo) { this.assignedTo = assignedTo; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
