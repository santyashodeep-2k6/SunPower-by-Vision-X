package com.visionx.sunflow.voice.dto;

import java.time.Instant;

public record VoiceTokenResponse(
        String token,
        String agentId,
        Instant expiresAt
) {}

