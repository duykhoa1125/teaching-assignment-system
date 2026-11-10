package vn.edu.tass.backend.utils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Set;
import vn.edu.tass.backend.exception.BadRequestException;

public final class InputRecordRules {
    private static final Set<String> VERIFICATION_STATUSES = Set.of("PENDING", "VERIFIED", "REJECTED");

    private InputRecordRules() {}

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

}
