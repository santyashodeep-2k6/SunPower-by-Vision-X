package com.visionx.sunflow.warranty.entity;

import com.visionx.sunflow.quotation.entity.Product;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * =============================================================================
 * ENTITY: Warranty
 * =============================================================================
 * Automatically generated hardware warranty tracking.
 * 
 * Hackathon Invariant (Acceptance Test 4 & 5):
 * Auto-generated on dispatch validation:
 * - PV Modules: 25 years (300 months)
 * - Inverters: 5 years (60 months)
 * Used to adjudicate whether fault repairs are Covered (₹0) or Chargeable.
 */
@Entity
@Table(name = "warranties")
public class Warranty {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "warranty_number", nullable = false, unique = true, length = 50)
    private String warrantyNumber;

    @Column(name = "serial_number", nullable = false, unique = true, length = 100)
    private String serialNumber;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "customer_id", length = 36)
    private String customerId;

    @Column(name = "order_id", length = 36)
    private String orderId;

    @Column(name = "term_months", nullable = false)
    private Integer termMonths;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private WarrantyStatus status = WarrantyStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Warranty() {}

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID().toString();
        if (createdAt == null) createdAt = Instant.now();
    }

    public boolean isCurrentlyCovered(LocalDate asOfDate) {
        if (status == WarrantyStatus.VOID) return false;
        return !asOfDate.isBefore(startDate) && !asOfDate.isAfter(endDate);
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getWarrantyNumber() { return warrantyNumber; }
    public void setWarrantyNumber(String warrantyNumber) { this.warrantyNumber = warrantyNumber; }

    public String getSerialNumber() { return serialNumber; }
    public void setSerialNumber(String serialNumber) { this.serialNumber = serialNumber; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public Integer getTermMonths() { return termMonths; }
    public void setTermMonths(Integer termMonths) { this.termMonths = termMonths; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public WarrantyStatus getStatus() { return status; }
    public void setStatus(WarrantyStatus status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}

