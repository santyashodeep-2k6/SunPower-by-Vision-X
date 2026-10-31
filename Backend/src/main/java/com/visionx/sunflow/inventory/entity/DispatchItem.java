package com.visionx.sunflow.inventory.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.visionx.sunflow.quotation.entity.Product;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * =============================================================================
 * ENTITY: DispatchItem
 * =============================================================================
 * Barcode serial tracking item for deliveries.
 */
@Entity
@Table(name = "dispatch_items")
public class DispatchItem {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispatch_order_id", nullable = false)
    @JsonIgnore
    private DispatchOrder dispatchOrder;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "serial_number", length = 100)
    private String serialNumber;

    @Column(name = "scanned_at")
    private Instant scannedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public DispatchItem() {}

    public DispatchItem(Product product, String serialNumber) {
        this.product = product;
        this.serialNumber = serialNumber;
        if (serialNumber != null) {
            this.scannedAt = Instant.now();
        }
    }

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID().toString();
        if (createdAt == null) createdAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public DispatchOrder getDispatchOrder() { return dispatchOrder; }
    public void setDispatchOrder(DispatchOrder dispatchOrder) { this.dispatchOrder = dispatchOrder; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    public String getSerialNumber() { return serialNumber; }
    public void setSerialNumber(String serialNumber) {
        this.serialNumber = serialNumber;
        if (serialNumber != null && this.scannedAt == null) {
            this.scannedAt = Instant.now();
        }
    }

    public Instant getScannedAt() { return scannedAt; }
    public void setScannedAt(Instant scannedAt) { this.scannedAt = scannedAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}

