package com.visionx.sunflow.quotation.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.visionx.sunflow.quotation.entity.ProductCategory;
import com.visionx.sunflow.quotation.entity.QuotationItem;

import java.math.BigDecimal;

public record QuotationItemResponse(
        String id,
        String productId,
        String itemName,
        ProductCategory category,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal totalPrice
) {
    @JsonProperty("description")
    public String description() {
        return itemName != null && !itemName.isBlank() ? itemName : "Solar Component";
    }

    @JsonProperty("qty")
    public int qty() {
        return quantity != null ? quantity.intValue() : 1;
    }

    @JsonProperty("unit")
    public String unit() {
        if (category == ProductCategory.MODULE) return "nos";
        if (category == ProductCategory.INVERTER) return "set";
        if (category == ProductCategory.STRUCTURE) return "kW";
        if (category == ProductCategory.BATTERY) return "units";
        return "nos";
    }

    @JsonProperty("total")
    public double total() {
        return totalPrice != null ? totalPrice.doubleValue() : (qty() * (unitPrice != null ? unitPrice.doubleValue() : 0.0));
    }

    public static QuotationItemResponse fromEntity(QuotationItem item) {
        return new QuotationItemResponse(
                item.getId(),
                item.getProductId(),
                item.getItemName(),
                item.getCategory(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getTotalPrice()
        );
    }
}
