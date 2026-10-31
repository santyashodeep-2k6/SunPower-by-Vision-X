package com.visionx.sunflow.lead;

import com.visionx.sunflow.common.exception.ResourceNotFoundException;
import com.visionx.sunflow.lead.dto.LeadCreateRequest;
import com.visionx.sunflow.lead.dto.LeadResponse;
import com.visionx.sunflow.lead.dto.LeadStatusUpdateRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Service
public class LeadService {

    private final LeadRepository leadRepository;

    public LeadService(LeadRepository leadRepository) {
        this.leadRepository = leadRepository;
    }

    @Transactional
    public LeadResponse createLead(LeadCreateRequest request) {
        Lead lead = new Lead();
        lead.setFullName(request.fullName().trim());
        lead.setPhone(request.phone().trim());
        lead.setEmail(request.email());
        lead.setAddress(request.address());
        lead.setCity(request.city());
        lead.setPropertyType(request.propertyType() != null ? request.propertyType() : PropertyType.RESIDENTIAL);
        lead.setRequestedCapacityKw(request.requestedCapacityKw());
        lead.setSystemType(request.systemType() != null ? request.systemType() : SystemType.ON_GRID);
        lead.setMonthlyBill(request.monthlyBill());
        lead.setRoofAreaSqft(request.roofAreaSqft());
        lead.setPreferredLanguage(request.preferredLanguage());
        lead.setSubsidyInterest(request.subsidyInterest() != null ? request.subsidyInterest() : false);
        lead.setChannel(request.channel() != null ? request.channel() : EnquiryChannel.WEB_FORM);
        lead.setStatus(LeadStatus.NEW);
        lead.setQualificationNotes(request.qualificationNotes());

        Lead saved = leadRepository.save(lead);
        return LeadResponse.from(saved);
    }

    @Transactional
    public LeadResponse patchLead(UUID id, Map<String, Object> patch) {
        Lead lead = leadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lead", id));

        if (patch.containsKey("name") && patch.get("name") != null) lead.setFullName(patch.get("name").toString());
        if (patch.containsKey("fullName") && patch.get("fullName") != null) lead.setFullName(patch.get("fullName").toString());
        if (patch.containsKey("phone") && patch.get("phone") != null) lead.setPhone(patch.get("phone").toString());
        if (patch.containsKey("email")) lead.setEmail(patch.get("email") != null ? patch.get("email").toString() : null);
        if (patch.containsKey("address")) lead.setAddress(patch.get("address") != null ? patch.get("address").toString() : null);
        if (patch.containsKey("city")) lead.setCity(patch.get("city") != null ? patch.get("city").toString() : null);
        if (patch.containsKey("propertyType") && patch.get("propertyType") != null) lead.setPropertyType(PropertyType.fromString(patch.get("propertyType").toString()));
        if (patch.containsKey("systemType") && patch.get("systemType") != null) lead.setSystemType(SystemType.fromString(patch.get("systemType").toString()));
        if (patch.containsKey("monthlyBill") && patch.get("monthlyBill") != null) lead.setMonthlyBill(new BigDecimal(patch.get("monthlyBill").toString()));
        if (patch.containsKey("roofArea") && patch.get("roofArea") != null) lead.setRoofAreaSqft(new BigDecimal(patch.get("roofArea").toString()));
        if (patch.containsKey("roofAreaSqft") && patch.get("roofAreaSqft") != null) lead.setRoofAreaSqft(new BigDecimal(patch.get("roofAreaSqft").toString()));
        if (patch.containsKey("preferredCapacity") && patch.get("preferredCapacity") != null) lead.setRequestedCapacityKw(new BigDecimal(patch.get("preferredCapacity").toString()));
        if (patch.containsKey("requestedCapacityKw") && patch.get("requestedCapacityKw") != null) lead.setRequestedCapacityKw(new BigDecimal(patch.get("requestedCapacityKw").toString()));
        if (patch.containsKey("status") && patch.get("status") != null) lead.setStatus(LeadStatus.fromString(patch.get("status").toString()));
        if (patch.containsKey("assignedTo")) lead.setAssignedTo(patch.get("assignedTo") != null ? patch.get("assignedTo").toString() : null);
        if (patch.containsKey("qualificationNotes")) lead.setQualificationNotes(patch.get("qualificationNotes") != null ? patch.get("qualificationNotes").toString() : null);

        Lead saved = leadRepository.save(lead);
        return LeadResponse.from(saved);
    }

    @Transactional
    public LeadResponse assignLead(UUID id, String userId) {
        Lead lead = leadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lead", id));
        lead.setAssignedTo(userId);
        Lead saved = leadRepository.save(lead);
        return LeadResponse.from(saved);
    }

    @Transactional
    public LeadResponse addNote(UUID id, String note) {
        Lead lead = leadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lead", id));
        String existing = lead.getQualificationNotes() != null ? lead.getQualificationNotes() + "\n" : "";
        lead.setQualificationNotes(existing + note);
        Lead saved = leadRepository.save(lead);
        return LeadResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public Page<LeadResponse> getLeads(LeadStatus status, EnquiryChannel channel,
                                       String search, Pageable pageable) {
        Page<Lead> leads;

        if (search != null && !search.isBlank()) {
            leads = leadRepository.searchByNameOrPhone(search.trim(), pageable);
        } else if (status != null && channel != null) {
            leads = leadRepository.findByStatusAndChannel(status, channel, pageable);
        } else if (status != null) {
            leads = leadRepository.findByStatus(status, pageable);
        } else if (channel != null) {
            leads = leadRepository.findByChannel(channel, pageable);
        } else {
            leads = leadRepository.findAll(pageable);
        }

        return leads.map(LeadResponse::from);
    }

    @Transactional(readOnly = true)
    public LeadResponse getLeadById(UUID id) {
        Lead lead = leadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lead", id));
        return LeadResponse.from(lead);
    }

    @Transactional
    public LeadResponse updateLeadStatus(UUID id, LeadStatusUpdateRequest request) {
        Lead lead = leadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lead", id));

        lead.setStatus(request.status());
        Lead updated = leadRepository.save(lead);
        return LeadResponse.from(updated);
    }
}
