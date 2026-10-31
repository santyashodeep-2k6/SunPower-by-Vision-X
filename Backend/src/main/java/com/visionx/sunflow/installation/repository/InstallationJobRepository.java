package com.visionx.sunflow.installation.repository;

import com.visionx.sunflow.installation.entity.InstallationJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InstallationJobRepository extends JpaRepository<InstallationJob, String> {
    Optional<InstallationJob> findByJobNumber(String jobNumber);
    List<InstallationJob> findByOrderId(String orderId);
    boolean existsByCrewNameAndScheduledDate(String crewName, LocalDate scheduledDate);
}

