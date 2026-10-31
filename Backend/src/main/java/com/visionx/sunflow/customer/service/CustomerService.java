package com.visionx.sunflow.customer.service;

import com.visionx.sunflow.common.exception.ResourceNotFoundException;
import com.visionx.sunflow.customer.dto.CustomerCreateRequest;
import com.visionx.sunflow.customer.dto.CustomerResponse;
import com.visionx.sunflow.customer.entity.Customer;
import com.visionx.sunflow.customer.repository.CustomerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * =============================================================================
 * SERVICE: CustomerService
 * =============================================================================
 * Business service managing customer records and deduplication.
 */
@Service
public class CustomerService {

    private final CustomerRepository customerRepository;

    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    @Transactional(readOnly = true)
    public List<CustomerResponse> findAll() {
        return customerRepository.findAll().stream()
            .map(CustomerResponse::fromEntity)
            .toList();
    }

    @Transactional(readOnly = true)
    public CustomerResponse findById(UUID id) {
        Customer customer = customerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));
        return CustomerResponse.fromEntity(customer);
    }

    @Transactional(readOnly = true)
    public CustomerResponse findByPhone(String phone) {
        Customer customer = customerRepository.findByPhone(phone)
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found with phone: " + phone));
        return CustomerResponse.fromEntity(customer);
    }

    @Transactional(readOnly = true)
    public CustomerResponse lookup(String phone, String email) {
        if (phone != null && !phone.isBlank()) {
            var found = customerRepository.findByPhone(phone.trim());
            if (found.isPresent()) return CustomerResponse.fromEntity(found.get());
        }
        if (email != null && !email.isBlank()) {
            var found = customerRepository.findByEmail(email.trim());
            if (found.isPresent()) return CustomerResponse.fromEntity(found.get());
        }
        return null;
    }

    @Transactional
    public CustomerResponse create(CustomerCreateRequest request) {
        // Return existing if customer with phone already exists
        return customerRepository.findByPhone(request.phone())
            .map(CustomerResponse::fromEntity)
            .orElseGet(() -> {
                Customer customer = new Customer(
                    request.name(),
                    request.email(),
                    request.phone(),
                    request.companyName(),
                    request.gstNumber()
                );
                return CustomerResponse.fromEntity(customerRepository.save(customer));
            });
    }
}
