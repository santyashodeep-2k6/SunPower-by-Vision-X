package com.visionx.sunflow.analytics.dto;

import java.math.BigDecimal;

public record DirectorDashboardResponse(
        BigDecimal totalRevenue,
        BigDecimal directHardwareCost,
        BigDecimal directLaborCost,
        BigDecimal totalDirectCost,
        BigDecimal grossProfit,
        BigDecimal grossMarginPercentage,
        long pendingSurveys,
        long pendingInstallations,
        long activeOrders,
        long openServiceTickets
) {}

