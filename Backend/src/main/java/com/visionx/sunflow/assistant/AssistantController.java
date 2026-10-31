package com.visionx.sunflow.assistant;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping({"/api/assistant", "/api/v1/assistant"})
@Tag(name = "Assistant", description = "AI conversational assistant endpoints for customer inquiries")
public class AssistantController {

    @PostMapping("/reply")
    @Operation(summary = "Get conversational AI reply for customer solar assistant")
    public ResponseEntity<Map<String, Object>> reply(@RequestBody Map<String, Object> body) {
        String text = body != null && body.containsKey("text") && body.get("text") != null
                ? body.get("text").toString().trim()
                : "";

        String slot = body != null && body.containsKey("slot") && body.get("slot") != null
                ? body.get("slot").toString().trim()
                : "chat";

        Map<String, Object> response = new HashMap<>();
        List<String> quickReplies = new ArrayList<>();
        Map<String, Object> collected = new HashMap<>();

        String lower = text.toLowerCase();

        String replyText;
        if (lower.contains("subsidy") || lower.contains("surya") || lower.contains("pm")) {
            replyText = "🏛️ **PM Surya Ghar: Muft Bijli Yojana** offers direct government subsidies for residential solar:\n\n" +
                    "- **1 kW System**: ₹30,000 Central Subsidy\n" +
                    "- **2 kW System**: ₹60,000 Central Subsidy\n" +
                    "- **3 kW to 10 kW**: Up to ₹78,000 Maximum Central Subsidy\n\n" +
                    "We handle end-to-end DISCOM net metering approvals and direct DBT portal subsidy disbursements.";
            quickReplies.add("💰 Calculate My Savings");
            quickReplies.add("📅 Book Free Site Survey");
            quickReplies.add("⚡ On-Grid vs Off-Grid");
        } else if (lower.contains("saving") || lower.contains("bill") || lower.contains("cost") || lower.contains("price")) {
            replyText = "💰 **Solar Savings Analysis**:\n\n" +
                    "A standard **3 kW On-Grid Rooftop System** generates ~360 units per month, saving approx **₹2,500 – ₹3,200 per month** on electricity bills.\n" +
                    "- Estimated ROI Payback: **3.2 to 3.8 years**\n" +
                    "- Guaranteed Lifetime: **25 Years** with Tier-1 bifacial mono-PERC panels.";
            quickReplies.add("🏛️ PM Surya Ghar Subsidy");
            quickReplies.add("📅 Book Free Site Survey");
            quickReplies.add("📞 Talk to Solar Expert");
        } else if (lower.contains("survey") || lower.contains("book") || lower.contains("visit")) {
            replyText = "📅 **Schedule Your Free Technical Site Survey**:\n\n" +
                    "Our certified solar engineers will inspect your rooftop, measure usable shadow-free area, inspect your electrical meter connection, and generate a 3D shadow analysis report within 24 hours.";
            quickReplies.add("Schedule Now");
            quickReplies.add("💰 Calculate Savings");
            quickReplies.add("🏛️ Subsidy Eligibility");
        } else if (lower.contains("grid") || lower.contains("type") || lower.contains("battery")) {
            replyText = "⚡ **System Types Compared**:\n\n" +
                    "1. **On-Grid (Most Popular)**: Connected to DISCOM grid with net metering. No expensive battery replacement. 100% eligible for PM Surya Ghar subsidy.\n" +
                    "2. **Hybrid / Off-Grid**: Includes lithium battery backup for areas with frequent power cuts.";
            quickReplies.add("💰 View 3kW Package");
            quickReplies.add("📅 Book Free Survey");
            quickReplies.add("🏛️ Subsidy Scheme");
        } else {
            replyText = "Welcome to **SunFlow 360**! I am your AI Solar Assistant.\n\n" +
                    "I can help you calculate electricity savings, estimate rooftop capacity, check your **PM Surya Ghar subsidy eligibility (up to ₹78,000)**, or schedule a free site survey.";
            quickReplies.add("💰 Estimate My Solar Savings");
            quickReplies.add("🏛️ PM Surya Ghar Subsidy");
            quickReplies.add("⚡ On-Grid vs Off-Grid");
            quickReplies.add("📅 Book Free Site Survey");
        }

        response.put("text", replyText);
        response.put("quickReplies", quickReplies);
        response.put("collected", collected);
        response.put("nextSlot", "chat");
        response.put("estimate", null);

        return ResponseEntity.ok(response);
    }
}

