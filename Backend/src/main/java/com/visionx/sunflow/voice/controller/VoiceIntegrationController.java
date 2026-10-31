package com.visionx.sunflow.voice.controller;

import com.visionx.sunflow.lead.EnquiryChannel;
import com.visionx.sunflow.lead.LeadService;
import com.visionx.sunflow.lead.PropertyType;
import com.visionx.sunflow.lead.SystemType;
import com.visionx.sunflow.lead.dto.LeadCreateRequest;
import com.visionx.sunflow.lead.dto.LeadResponse;
import com.visionx.sunflow.voice.dto.VoiceTokenResponse;
import com.visionx.sunflow.voice.dto.VoiceWebhookPayload;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * =============================================================================
 * CONTROLLER: VoiceIntegrationController
 * =============================================================================
 * ElevenLabs Conversational AI WebRTC Token & Webhook Integration.
 * 
 * Hackathon Highlights:
 * - Provides ephemeral credentials for frontend voice calls.
 * - Ingests post-call webhooks and creates qualified CRM leads with transcript history.
 */
@RestController
@RequestMapping({"/api/voice", "/api/v1/voice"})
@Tag(name = "AI Voice Integration", description = "ElevenLabs Conversational AI WebRTC Token & Webhook APIs")
public class VoiceIntegrationController {

    private final LeadService leadService;

    @Value("${elevenlabs.agent-id:agent_demo_123}")
    private String agentId;

    public VoiceIntegrationController(LeadService leadService) {
        this.leadService = leadService;
    }

    @GetMapping("/token")
    @Operation(summary = "Get WebRTC ephemeral session token for ElevenLabs voice call")
    public ResponseEntity<VoiceTokenResponse> getVoiceToken() {
        // Generates an ephemeral session identifier with 1-hour validity
        String ephemeralToken = "session_" + UUID.randomUUID().toString().replace("-", "");
        Instant expiresAt = Instant.now().plusSeconds(3600);
        return ResponseEntity.ok(new VoiceTokenResponse(ephemeralToken, agentId, expiresAt));
    }

    @PostMapping("/webhook")
    @Operation(summary = "ElevenLabs Post-Call Webhook (Ingests transcript and creates CRM lead)")
    public ResponseEntity<Map<String, Object>> handleVoiceWebhook(
            @RequestHeader(value = "elevenlabs-signature", required = false) String signature,
            @RequestBody VoiceWebhookPayload payload
    ) {
        // Construct CRM Lead from AI extracted fields
        LeadCreateRequest leadRequest = new LeadCreateRequest(
                payload.customerName() != null ? payload.customerName() : "AI Voice Lead",
                payload.customerPhone() != null ? payload.customerPhone() : "9820000000",
                null,
                "Voice Call Lead (Conversation: " + payload.conversationId() + ")",
                payload.city() != null ? payload.city() : "Pune",
                PropertyType.RESIDENTIAL,
                payload.capacityKw() != null ? BigDecimal.valueOf(payload.capacityKw()) : new BigDecimal("3.0"),
                SystemType.ON_GRID,
                payload.monthlyBill() != null ? BigDecimal.valueOf(payload.monthlyBill()) : null,
                null,
                "English",
                true,
                EnquiryChannel.VOICE,
                "AI Call Summary: " + (payload.summary() != null ? payload.summary() : "Customer completed solar voice interview.")
        );

        LeadResponse createdLead = leadService.createLead(leadRequest);

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Lead automatically created in CRM from voice conversation.",
                "leadId", createdLead.id().toString()
        ));
    }
}
