package com.visionx.sunflow.service.service;

import com.visionx.sunflow.common.exception.ResourceNotFoundException;
import com.visionx.sunflow.service.dto.TicketCreateRequest;
import com.visionx.sunflow.service.dto.TicketResponse;
import com.visionx.sunflow.service.entity.ServiceTicket;
import com.visionx.sunflow.service.repository.ServiceTicketRepository;
import com.visionx.sunflow.warranty.service.WarrantyAutomationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * =============================================================================
 * SERVICE: ServiceTicketService
 * =============================================================================
 * Customer helpdesk & automated warranty adjudication engine.
 * 
 * Hackathon Highlights:
 * - Acceptance Test 5 (Installation and Repair Adjudication):
 *   Checks hardware serial warranty status at time of reported fault:
 *   - Under warranty (e.g. 18 months in) -> 100% COVERED (₹0.00)
 *   - Expired warranty (e.g. 6 years in) -> CHARGEABLE (₹3,500.00)
 * - Negative Test:
 *   Blocks closing a chargeable repair ticket unless customer confirmation is recorded.
 */
@Service
public class ServiceTicketService {

    private final ServiceTicketRepository ticketRepository;
    private final WarrantyAutomationService warrantyAutomationService;

    private static final BigDecimal DEFAULT_CHARGEABLE_REPAIR_FEE = new BigDecimal("3500.00");

    public ServiceTicketService(
            ServiceTicketRepository ticketRepository,
            WarrantyAutomationService warrantyAutomationService
    ) {
        this.ticketRepository = ticketRepository;
        this.warrantyAutomationService = warrantyAutomationService;
    }

    /**
     * Acceptance Test 5:
     * Raises ticket and adjudicates warranty status based on reported fault date.
     */
    @Transactional
    public TicketResponse raiseTicket(TicketCreateRequest request) {
        LocalDate faultDate = request.faultDate() != null ? request.faultDate() : LocalDate.now();

        var warrantyResult = warrantyAutomationService.checkWarrantyAtDate(request.serialNumber(), faultDate);

        ServiceTicket ticket = new ServiceTicket();
        ticket.setTicketNumber(generateTicketNumber());
        ticket.setCustomerId(request.customerId());
        ticket.setSerialNumber(request.serialNumber());
        ticket.setIssueDescription(request.issueDescription());
        ticket.setWarrantyCovered(warrantyResult.covered());

        if (warrantyResult.covered()) {
            ticket.setChargeableAmount(BigDecimal.ZERO);
            ticket.setCustomerConfirmed(true); // Free warranty work is pre-approved
            ticket.setStatus("OPEN");
        } else {
            ticket.setChargeableAmount(DEFAULT_CHARGEABLE_REPAIR_FEE);
            ticket.setCustomerConfirmed(false); // Requires customer confirmation for paid repair
            ticket.setStatus("PENDING_CUSTOMER_APPROVAL");
        }

        ServiceTicket saved = ticketRepository.save(ticket);
        return TicketResponse.fromEntity(saved);
    }

    @Transactional
    public TicketResponse confirmByCustomer(String ticketId) {
        ServiceTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("ServiceTicket", ticketId));

        ticket.setCustomerConfirmed(true);
        ticket.setStatus("IN_PROGRESS");
        ServiceTicket saved = ticketRepository.save(ticket);
        return TicketResponse.fromEntity(saved);
    }

    /**
     * Negative Test Invariant:
     * Do not close a repair ticket before required customer confirmation.
     */
    @Transactional
    public TicketResponse closeTicket(String ticketId, String resolutionNotes) {
        ServiceTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("ServiceTicket", ticketId));

        if (!ticket.getWarrantyCovered() && !ticket.getCustomerConfirmed()) {
            throw new IllegalStateException(
                    "Negative Test Violation: Cannot close chargeable repair ticket before required customer confirmation."
            );
        }

        ticket.setStatus("CLOSED");
        ticket.setResolutionNotes(resolutionNotes);
        ticket.setClosedAt(Instant.now());

        ServiceTicket saved = ticketRepository.save(ticket);
        return TicketResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public TicketResponse getTicketById(String id) {
        return ticketRepository.findById(id)
                .map(TicketResponse::fromEntity)
                .orElseThrow(() -> new ResourceNotFoundException("ServiceTicket", id));
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> getTicketsBySerial(String serialNumber) {
        return ticketRepository.findBySerialNumber(serialNumber).stream()
                .map(TicketResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> getAllTickets() {
        return ticketRepository.findAll().stream()
                .map(TicketResponse::fromEntity)
                .toList();
    }

    private String generateTicketNumber() {
        String period = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        long count = ticketRepository.count() + 1;
        return String.format("TCK-%s-%04d", period, count);
    }
}

