package com.visionx.sunflow.voice.dto;

import java.util.Map;

public record VoiceWebhookPayload(
        String conversationId,
        String customerName,
        String customerPhone,
        String city,
        Double monthlyBill,
        Double capacityKw,
        String summary,
        String transcript,
        Map<String, Object> collectedFields
) {}

