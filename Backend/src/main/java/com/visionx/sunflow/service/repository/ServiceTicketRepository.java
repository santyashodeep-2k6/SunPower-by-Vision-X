package com.visionx.sunflow.service.repository;

import com.visionx.sunflow.service.entity.ServiceTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceTicketRepository extends JpaRepository<ServiceTicket, String> {
    Optional<ServiceTicket> findByTicketNumber(String ticketNumber);
    List<ServiceTicket> findBySerialNumber(String serialNumber);
    List<ServiceTicket> findByCustomerId(String customerId);
}

