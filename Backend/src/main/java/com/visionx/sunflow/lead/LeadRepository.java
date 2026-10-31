package com.visionx.sunflow.lead;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface LeadRepository extends JpaRepository<Lead, UUID> {

    Page<Lead> findByStatus(LeadStatus status, Pageable pageable);

    Page<Lead> findByChannel(EnquiryChannel channel, Pageable pageable);

    Page<Lead> findByStatusAndChannel(LeadStatus status, EnquiryChannel channel, Pageable pageable);

    @Query("SELECT l FROM Lead l WHERE " +
           "LOWER(l.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "l.phone LIKE CONCAT('%', :query, '%')")
    Page<Lead> searchByNameOrPhone(@Param("query") String query, Pageable pageable);
}
