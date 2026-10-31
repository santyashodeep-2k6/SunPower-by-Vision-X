package com.visionx.sunflow.lead;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.visionx.sunflow.lead.dto.LeadCreateRequest;
import com.visionx.sunflow.lead.dto.LeadStatusUpdateRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LeadControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private LeadCreateRequest validRequest() {
        return new LeadCreateRequest(
                "Rahul Sharma",
                "9876543210",
                "rahul@example.com",
                "123 Solar Lane",
                "Ahmedabad",
                PropertyType.RESIDENTIAL,
                new BigDecimal("5.0"),
                SystemType.ON_GRID,
                new BigDecimal("3500"),
                new BigDecimal("800"),
                "English",
                true,
                EnquiryChannel.WEB_FORM,
                null
        );
    }

    // --- CREATE ---

    @Test
    void createLead_validRequest_returns201() throws Exception {
        mockMvc.perform(post("/api/leads")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.fullName", is("Rahul Sharma")))
                .andExpect(jsonPath("$.phone", is("9876543210")))
                .andExpect(jsonPath("$.status", is("NEW")))
                .andExpect(jsonPath("$.channel", is("WEB_FORM")))
                .andExpect(jsonPath("$.createdAt", notNullValue()));
    }

    @Test
    void createLead_minimalValidFields_returns201() throws Exception {
        LeadCreateRequest minimal = new LeadCreateRequest(
                "Priya Patel",
                "9123456789",
                null, null, null, null, null, null,
                null, null, null, null, null, null
        );
        mockMvc.perform(post("/api/leads")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(minimal)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fullName", is("Priya Patel")))
                .andExpect(jsonPath("$.channel", is("WEB_FORM")))
                .andExpect(jsonPath("$.status", is("NEW")));
    }

    @Test
    void createLead_missingFullName_returns400() throws Exception {
        LeadCreateRequest invalid = new LeadCreateRequest(
                "",     // blank name
                "9876543210",
                null, null, null, null, null, null,
                null, null, null, null, null, null
        );
        mockMvc.perform(post("/api/leads")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void createLead_missingPhone_returns400() throws Exception {
        LeadCreateRequest invalid = new LeadCreateRequest(
                "Test User",
                "",     // blank phone
                null, null, null, null, null, null,
                null, null, null, null, null, null
        );
        mockMvc.perform(post("/api/leads")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void createLead_invalidEmail_returns400() throws Exception {
        LeadCreateRequest invalid = new LeadCreateRequest(
                "Test User",
                "9876543210",
                "not-an-email",
                null, null, null, null, null,
                null, null, null, null, null, null
        );
        mockMvc.perform(post("/api/leads")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field", is("email")));
    }

    // --- LIST ---

    @Test
    void getLeads_returnsPagedResults() throws Exception {
        // Create a lead first
        mockMvc.perform(post("/api/leads")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRequest())));

        mockMvc.perform(get("/api/leads"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.pageable", notNullValue()));
    }

    @Test
    void getLeads_filterByStatus_works() throws Exception {
        mockMvc.perform(get("/api/leads").param("status", "NEW"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void getLeads_filterByChannel_works() throws Exception {
        mockMvc.perform(get("/api/leads").param("channel", "WEB_FORM"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void getLeads_searchByName_works() throws Exception {
        // Create a lead with known name
        mockMvc.perform(post("/api/leads")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRequest())));

        mockMvc.perform(get("/api/leads").param("search", "Rahul"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(greaterThanOrEqualTo(1))));
    }

    // --- GET BY ID ---

    @Test
    void getLeadById_existingLead_returns200() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/leads")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andReturn();

        String id = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(get("/api/leads/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(id)))
                .andExpect(jsonPath("$.fullName", is("Rahul Sharma")));
    }

    @Test
    void getLeadById_missingLead_returns404() throws Exception {
        mockMvc.perform(get("/api/leads/{id}", "00000000-0000-0000-0000-000000000000"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", notNullValue()));
    }

    // --- STATUS UPDATE ---

    @Test
    void updateStatus_validTransition_returns200() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/leads")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andReturn();

        String id = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();

        LeadStatusUpdateRequest statusUpdate = new LeadStatusUpdateRequest(LeadStatus.CONTACTED);

        mockMvc.perform(patch("/api/leads/{id}/status", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusUpdate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CONTACTED")));
    }

    @Test
    void updateStatus_missingLead_returns404() throws Exception {
        LeadStatusUpdateRequest statusUpdate = new LeadStatusUpdateRequest(LeadStatus.CONTACTED);

        mockMvc.perform(patch("/api/leads/{id}/status", "00000000-0000-0000-0000-000000000000")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusUpdate)))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateStatus_invalidStatusValue_returns400() throws Exception {
        mockMvc.perform(patch("/api/leads/{id}/status", "00000000-0000-0000-0000-000000000001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"INVALID_STATUS\"}"))
                .andExpect(status().isBadRequest());
    }
}
