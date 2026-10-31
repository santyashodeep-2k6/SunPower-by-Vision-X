package com.visionx.sunflow.customer.entity;

import com.visionx.sunflow.lead.PropertyType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * =============================================================================
 * ENTITY: Site
 * =============================================================================
 * Represents the physical rooftop address and electrical connection where
 * the solar panels and inverter will be mounted.
 */
@Entity
@Table(name = "sites")
@EntityListeners(AuditingEntityListener.class)
public class Site {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @NotNull
    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "property_type", nullable = false, length = 30)
    private PropertyType propertyType = PropertyType.RESIDENTIAL;

    @NotBlank
    @Column(nullable = false, length = 500)
    private String address;

    @NotBlank
    @Column(nullable = false, length = 100)
    private String city;

    @Column(name = "pin_code", length = 20)
    private String pinCode;

    @Column(name = "sanction_load_kw", precision = 8, scale = 2)
    private BigDecimal sanctionLoadKw;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public Site() {}

    public Site(UUID customerId, PropertyType propertyType, String address, String city, String pinCode, BigDecimal sanctionLoadKw) {
        this.customerId = customerId;
        this.propertyType = propertyType;
        this.address = address;
        this.city = city;
        this.pinCode = pinCode;
        this.sanctionLoadKw = sanctionLoadKw;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getCustomerId() { return customerId; }
    public void setCustomerId(UUID customerId) { this.customerId = customerId; }

    public PropertyType getPropertyType() { return propertyType; }
    public void setPropertyType(PropertyType propertyType) { this.propertyType = propertyType; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getPinCode() { return pinCode; }
    public void setPinCode(String pinCode) { this.pinCode = pinCode; }

    public BigDecimal getSanctionLoadKw() { return sanctionLoadKw; }
    public void setSanctionLoadKw(BigDecimal sanctionLoadKw) { this.sanctionLoadKw = sanctionLoadKw; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}

