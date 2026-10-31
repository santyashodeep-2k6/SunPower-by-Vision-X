package com.visionx.sunflow.quotation.controller;

import com.visionx.sunflow.quotation.entity.Product;
import com.visionx.sunflow.quotation.repository.ProductRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Hardware Catalog Products REST API for frontend hydration.
 */
@RestController
@RequestMapping({"/api/products", "/api/v1/products"})
@Tag(name = "Products", description = "Hardware catalog products for solar installations")
public class ProductController {

    private final ProductRepository productRepository;

    public ProductController(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @GetMapping
    @Operation(summary = "Get all active catalog products")
    public ResponseEntity<List<Product>> getAllProducts() {
        return ResponseEntity.ok(productRepository.findAll());
    }
}

