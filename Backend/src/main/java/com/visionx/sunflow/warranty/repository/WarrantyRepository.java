package com.visionx.sunflow.warranty.repository;

import com.visionx.sunflow.warranty.entity.Warranty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WarrantyRepository extends JpaRepository<Warranty, String> {
    Optional<Warranty> findBySerialNumber(String serialNumber);
    List<Warranty> findByCustomerId(String customerId);
    List<Warranty> findByOrderId(String orderId);
}

