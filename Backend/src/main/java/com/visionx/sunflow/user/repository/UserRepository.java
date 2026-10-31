package com.visionx.sunflow.user.repository;

import com.visionx.sunflow.common.security.Role;
import com.visionx.sunflow.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * =============================================================================
 * REPOSITORY: UserRepository
 * =============================================================================
 * Handles data access queries for users.
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    List<User> findByRoleAndActiveTrue(Role role);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}

