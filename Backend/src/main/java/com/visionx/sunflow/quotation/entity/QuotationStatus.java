package com.visionx.sunflow.quotation.entity;

/**
 * Lifecycle states of an engineering Quotation.
 * Enforces the Survey Gate requirement:
 * Cannot transition to SENT/APPROVED if survey is not APPROVED.
 */
public enum QuotationStatus {
    DRAFT,
    PENDING_SURVEY_APPROVAL,
    APPROVED,
    SENT,
    ACCEPTED,
    REJECTED
}

