package com.visionx.sunflow.service.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * =============================================================================
 * ENTITY: ServiceTicket
 * =============================================================================
 * Helpdesk fault reporting, automated warranty adjudication, and customer confirmation.
 */
@Entity
@Table(name = "service_tickets")
public class ServiceTicket {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "ticket_number", nullable = false, unique = true, length = 50)
    private String ticketNumber;

    @Column(name = "customer_id", length = 36)
    private String customerId;

    @Column(name = "serial_number", nullable = false, length = 100)
    private String serialNumber;

    @Column(name = "issue_description", nullable = false, columnDefinition = "TEXT")
    private String issueDescription;

    @Column(name = "warranty_covered", nullable = false)
    private Boolean warrantyCovered = false;

    @Column(name = "chargeable_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal chargeableAmount = BigDecimal.ZERO;

    @Column(name = "customer_confirmed", nullable = false)
    private Boolean customerConfirmed = false;

    @Column(nullable = false, length = 50)
    private String status = "OPEN"; // OPEN, IN_PROGRESS, RESOLVED, CLOSED

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public ServiceTicket() {}

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID().toString();
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTicketNumber() { return ticketNumber; }
    public void setTicketNumber(String ticketNumber) { this.ticketNumber = ticketNumber; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getSerialNumber() { return serialNumber; }
    public void setSerialNumber(String serialNumber) { this.serialNumber = serialNumber; }

    public String getIssueDescription() { return issueDescription; }
    public void setIssueDescription(String issueDescription) { this.issueDescription = issueDescription; }

    public Boolean getWarrantyCovered() { return warrantyCovered; }
    public void setWarrantyCovered(Boolean warrantyCovered) { this.warrantyCovered = warrantyCovered; }

    public BigDecimal getChargeableAmount() { return chargeableAmount; }
    public void setChargeableAmount(BigDecimal chargeableAmount) { this.chargeableAmount = chargeableAmount; }

    public Boolean getCustomerConfirmed() { return customerConfirmed; }
    public void setCustomerConfirmed(Boolean customerConfirmed) { this.customerConfirmed = customerConfirmed; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getResolutionNotes() { return resolutionNotes; }
    public void setResolutionNotes(String resolutionNotes) { this.resolutionNotes = resolutionNotes; }

    public Instant getClosedAt() { return closedAt; }
    public void setClosedAt(Instant closedAt) { this.closedAt = closedAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}

