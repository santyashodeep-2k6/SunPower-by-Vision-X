package com.visionx.sunflow.customer.service;

import com.visionx.sunflow.common.exception.ResourceNotFoundException;
import com.visionx.sunflow.customer.dto.SiteCreateRequest;
import com.visionx.sunflow.customer.dto.SiteResponse;
import com.visionx.sunflow.customer.entity.Site;
import com.visionx.sunflow.customer.repository.CustomerRepository;
import com.visionx.sunflow.customer.repository.SiteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * =============================================================================
 * SERVICE: SiteService
 * =============================================================================
 * Manages customer installation properties.
 */
@Service
public class SiteService {

    private final SiteRepository siteRepository;
    private final CustomerRepository customerRepository;

    public SiteService(SiteRepository siteRepository, CustomerRepository customerRepository) {
        this.siteRepository = siteRepository;
        this.customerRepository = customerRepository;
    }

    @Transactional(readOnly = true)
    public List<SiteResponse> findAll() {
        return siteRepository.findAll().stream()
            .map(SiteResponse::fromEntity)
            .toList();
    }

    @Transactional(readOnly = true)
    public SiteResponse findById(UUID id) {
        Site site = siteRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Site not found with id: " + id));
        return SiteResponse.fromEntity(site);
    }

    @Transactional(readOnly = true)
    public List<SiteResponse> findByCustomerId(UUID customerId) {
        return siteRepository.findByCustomerId(customerId).stream()
            .map(SiteResponse::fromEntity)
            .toList();
    }

    @Transactional
    public SiteResponse create(SiteCreateRequest request) {
        if (!customerRepository.existsById(request.customerId())) {
            throw new ResourceNotFoundException("Customer not found with id: " + request.customerId());
        }

        Site site = new Site(
            request.customerId(),
            request.propertyType(),
            request.address(),
            request.city(),
            request.pinCode(),
            request.sanctionLoadKw()
        );

        return SiteResponse.fromEntity(siteRepository.save(site));
    }
}

