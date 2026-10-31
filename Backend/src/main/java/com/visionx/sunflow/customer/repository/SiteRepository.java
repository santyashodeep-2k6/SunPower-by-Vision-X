package com.visionx.sunflow.customer.repository;

import com.visionx.sunflow.customer.entity.Site;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SiteRepository extends JpaRepository<Site, UUID> {
    List<Site> findByCustomerId(UUID customerId);
}

