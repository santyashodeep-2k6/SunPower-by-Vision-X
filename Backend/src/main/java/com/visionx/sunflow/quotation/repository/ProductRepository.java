package com.visionx.sunflow.quotation.repository;

import com.visionx.sunflow.quotation.entity.Product;
import com.visionx.sunflow.quotation.entity.ProductCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, String> {
    Optional<Product> findBySku(String sku);
    List<Product> findByCategoryAndActiveTrue(ProductCategory category);
}

