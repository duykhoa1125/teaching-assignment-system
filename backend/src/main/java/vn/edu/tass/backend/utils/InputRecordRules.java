package vn.edu.tass.backend.utils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Set;
import vn.edu.tass.backend.exception.BadRequestException;
import vn.edu.tass.backend.payload.request.TeacherDutyRequest;
import vn.edu.tass.backend.payload.request.TeacherWorkloadBasisRequest;
import vn.edu.tass.backend.payload.request.TeachingHistoryRequest;

public final class InputRecordRules {
    private static final Set<String> VERIFICATION_STATUSES = Set.of("PENDING", "VERIFIED", "REJECTED");
    private static final Set<String> DEMAND_STATUSES = Set.of("ACTIVE", "INACTIVE");
    private static final Set<String> EMPLOYMENT_STATUSES = Set.of("TEACHING", "ON_LEAVE", "INACTIVE");
    private static final Set<String> QUALIFICATION_STATUSES = Set.of("PENDING", "VERIFIED", "INACTIVE");

    private InputRecordRules() {}

    public static void demandStatus(String status) {
        requireStatus(status, DEMAND_STATUSES, "status");
    }

    public static void employmentStatus(String status) {
        requireStatus(status, EMPLOYMENT_STATUSES, "employment_status");
    }

    public static void qualificationStatus(String status) {
        requireStatus(status, QUALIFICATION_STATUSES, "verification_status");
    }

    private static void requireStatus(String status, Set<String> allowed, String field) {
        if (status == null || !allowed.contains(status)) {
            throw new BadRequestException(field + " is invalid");
        }
    }

    public static void dates(LocalDate from, LocalDate to, String fromName, String toName) {
        if (from == null || to == null || to.isBefore(from)) {
            throw new BadRequestException(toName + " must be on or after " + fromName);
        }
    }

    public static void optionalEnd(LocalDate from, LocalDate to, String fromName, String toName) {
        if (from == null || to != null && to.isBefore(from)) {
            throw new BadRequestException(toName + " must be on or after " + fromName);
        }
    }

    public static void orderedTimes(OffsetDateTime from, OffsetDateTime to, String fromName, String toName) {
        if (from != null && to != null && to.isBefore(from)) {
            throw new BadRequestException(toName + " must be on or after " + fromName);
        }
    }

    public static void confirmation(Long by, OffsetDateTime at, String name) {
        if ((by == null) != (at == null)) {
            throw new BadRequestException(name + " requires actor and timestamp together");
        }
    }

    public static void verification(String status, Long by, OffsetDateTime at) {
        if (!VERIFICATION_STATUSES.contains(status == null ? "" : status)) {
            throw new BadRequestException("verification_status is invalid");
        }
        if ((by == null) != (at == null) || "VERIFIED".equals(status) && by == null) {
            throw new BadRequestException("verification requires verified_by and verified_at together");
        }
    }

    public static void nonnegativePeriod(BigDecimal value, String name) {
        if (value != null && (value.signum() < 0 || value.compareTo(new BigDecimal("999.99")) > 0
                || value.stripTrailingZeros().scale() > 2)) {
            throw new BadRequestException(name + " must be between 0 and 999.99 with at most two decimal places");
        }
    }

    public static void validate(TeachingHistoryRequest request) {
        dates(request.getTaughtFrom(), request.getTaughtTo(), "taught_from", "taught_to");
        if (!Set.of("EXTERNAL_RECORD", "CONFIRMED_ACTUAL").contains(
                request.getSourceKind() == null ? "" : request.getSourceKind())) {
            throw new BadRequestException("source_kind is invalid");
        }
        verification(request.getVerificationStatus(), request.getVerifiedBy(), request.getVerifiedAt());
        if (request.getSourcePlanDemandId() != null && !"CONFIRMED_ACTUAL".equals(request.getSourceKind())) {
            throw new BadRequestException("source_plan_demand_id requires CONFIRMED_ACTUAL source_kind");
        }
    }

    public static void validate(TeacherWorkloadBasisRequest request) {
        dates(request.getValidFrom(), request.getValidTo(), "valid_from", "valid_to");
        BigDecimal base = request.getBasePeriodsPerWeek();
        nonnegativePeriod(base, "base_periods_per_week");
        if (base == null || base.signum() == 0) {
            throw new BadRequestException("base_periods_per_week must be positive");
        }
        if (!"PERIOD_PER_WEEK".equals(request.getUnit())) {
            throw new BadRequestException("unit must be PERIOD_PER_WEEK");
        }
        verification(request.getVerificationStatus(), request.getVerifiedBy(), request.getVerifiedAt());
    }

    public static void validate(TeacherDutyRequest request) {
        if (request.getValidTo() != null) {
            dates(request.getValidFrom(), request.getValidTo(), "valid_from", "valid_to");
        }
        nonnegativePeriod(request.getReductionValue(), "reduction_value");
        if ("HOMEROOM".equals(request.getDutyType()) && request.getClassId() == null) {
            throw new BadRequestException("HOMEROOM duty requires class_id");
        }
        if ("VERIFIED".equals(request.getVerificationStatus()) && request.getVerifiedBy() == null) {
            throw new BadRequestException("VERIFIED duty requires verified_by");
        }
    }
}
