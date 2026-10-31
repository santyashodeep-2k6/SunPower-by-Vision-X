package com.visionx.sunflow.inventory.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * =============================================================================
 * ENTITY: DispatchOrder
 * =============================================================================
 * Warehouse fulfillment order containing serialized components for dispatch.
 * 
 * Hackathon Invariant (Acceptance Test 3):
 * Dispatch cannot be validated if ANY required serialized item lacks a serial number!
 */
@Entity
@Table(name = "dispatch_orders")
public class DispatchOrder {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "dispatch_number", nullable = false, unique = true, length = 50)
    private String dispatchNumber;

    @Column(name = "order_id", nullable = false, length = 36)
    private String orderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private DispatchOrderStatus status = DispatchOrderStatus.DRAFT;

    @Column(name = "dispatched_at")
    private Instant dispatchedAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Column(name = "delivery_person", length = 100)
    private String deliveryPerson;

    @Column(name = "delivery_phone", length = 20)
    private String deliveryPhone;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "dispatchOrder", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<DispatchItem> items = new ArrayList<>();

    public DispatchOrder() {}

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

    public void addItem(DispatchItem item) {
        items.add(item);
        item.setDispatchOrder(this);
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDispatchNumber() { return dispatchNumber; }
    public void setDispatchNumber(String dispatchNumber) { this.dispatchNumber = dispatchNumber; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public DispatchOrderStatus getStatus() { return status; }
    public void setStatus(DispatchOrderStatus status) { this.status = status; }

    public Instant getDispatchedAt() { return dispatchedAt; }
    public void setDispatchedAt(Instant dispatchedAt) { this.dispatchedAt = dispatchedAt; }

    public Instant getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(Instant deliveredAt) { this.deliveredAt = deliveredAt; }

    public String getDeliveryPerson() { return deliveryPerson; }
    public void setDeliveryPerson(String deliveryPerson) { this.deliveryPerson = deliveryPerson; }

    public String getDeliveryPhone() { return deliveryPhone; }
    public void setDeliveryPhone(String deliveryPhone) { this.deliveryPhone = deliveryPhone; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public List<DispatchItem> getItems() { return items; }
    public void setItems(List<DispatchItem> items) { this.items = items; }
}

