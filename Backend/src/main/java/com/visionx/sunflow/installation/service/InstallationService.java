package com.visionx.sunflow.installation.service;

import com.visionx.sunflow.common.exception.ResourceNotFoundException;
import com.visionx.sunflow.installation.entity.InstallationJob;
import com.visionx.sunflow.installation.repository.InstallationJobRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * =============================================================================
 * SERVICE: InstallationService
 * =============================================================================
 * Installation crew planning and double-booking guard.
 */
@Service
public class InstallationService {

    private final InstallationJobRepository installationJobRepository;

    public InstallationService(InstallationJobRepository installationJobRepository) {
        this.installationJobRepository = installationJobRepository;
    }

    @Transactional
    public InstallationJob scheduleJob(String orderId, String crewName, LocalDate scheduledDate) {
        // Negative Test: Prevent the same crew from being double-booked
        if (installationJobRepository.existsByCrewNameAndScheduledDate(crewName, scheduledDate)) {
            throw new IllegalStateException(
                    "Double-Booking Violation: Crew '" + crewName + "' is already assigned to an installation job on " + scheduledDate + "."
            );
        }

        InstallationJob job = new InstallationJob();
        job.setJobNumber(generateJobNumber());
        job.setOrderId(orderId);
        job.setCrewName(crewName);
        job.setScheduledDate(scheduledDate);
        job.setStatus("SCHEDULED");
        job.setChecklistCompleted(false);

        return installationJobRepository.save(job);
    }

    @Transactional
    public InstallationJob completeJob(String jobId, String customerSignature) {
        InstallationJob job = installationJobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("InstallationJob", jobId));

        job.setChecklistCompleted(true);
        job.setCustomerSignature(customerSignature);
        job.setStatus("COMPLETED");
        job.setCompletedAt(Instant.now());

        return installationJobRepository.save(job);
    }

    @Transactional(readOnly = true)
    public List<InstallationJob> getAllJobs() {
        return installationJobRepository.findAll();
    }

    private String generateJobNumber() {
        String period = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        long count = installationJobRepository.count() + 1;
        return String.format("JOB-%s-%04d", period, count);
    }
}

