package com.visionx.sunflow.lead.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.visionx.sunflow.lead.EnquiryChannel;
import com.visionx.sunflow.lead.PropertyType;
import com.visionx.sunflow.lead.SystemType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record LeadCreateRequest(
        @NotBlank(message = "Full name is required")
        @Size(max = 200, message = "Full name must not exceed 200 characters")
        @JsonAlias({"name", "customerName", "contactName"})
        String fullName,

        @NotBlank(message = "Phone number is required")
        @Size(max = 20, message = "Phone number must not exceed 20 characters")
        String phone,

        @Email(message = "Invalid email format")
        @Size(max = 255)
        String email,

        @Size(max = 500)
        String address,

        @Size(max = 100)
        String city,

        PropertyType propertyType,

        @JsonAlias({"preferredCapacity", "capacity", "capacityKw"})
        BigDecimal requestedCapacityKw,

        SystemType systemType,

        BigDecimal monthlyBill,

        @JsonAlias({"roofArea", "areaSqft"})
        BigDecimal roofAreaSqft,

        @JsonAlias({"language"})
        @Size(max = 30)
        String preferredLanguage,

        Boolean subsidyInterest,

        @JsonAlias({"source"})
        EnquiryChannel channel,

        @JsonAlias({"qualificationNotes", "notes"})
        @Size(max = 2000)
        String requirements
) {
    public LeadCreateRequest(String fullName, String phone, String email, String address, String city,
                             PropertyType propertyType, BigDecimal requestedCapacityKw, SystemType systemType,
                             BigDecimal monthlyBill, BigDecimal roofAreaSqft, String preferredLanguage,
                             Boolean subsidyInterest, EnquiryChannel channel, String requirements) {
        this.fullName = fullName;
        this.phone = phone;
        this.email = email;
        this.address = address;
        this.city = city;
        this.propertyType = propertyType != null ? propertyType : PropertyType.RESIDENTIAL;
        this.requestedCapacityKw = requestedCapacityKw;
        this.systemType = systemType != null ? systemType : SystemType.ON_GRID;
        this.monthlyBill = monthlyBill;
        this.roofAreaSqft = roofAreaSqft;
        this.preferredLanguage = preferredLanguage != null ? preferredLanguage : "English";
        this.subsidyInterest = subsidyInterest != null ? subsidyInterest : Boolean.TRUE;
        this.channel = channel != null ? channel : EnquiryChannel.WEB_FORM;
        this.requirements = requirements;
    }

    public String qualificationNotes() {
        return requirements;
    }
}
