package com.visionx.sunflow.quotation.dto;

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

