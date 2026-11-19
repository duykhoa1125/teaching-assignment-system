package vn.edu.tass.backend.payload.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PlanAssignmentDto(
    Long requiredComponentId,
    Long planDemandId,
    Long demandId,
    Long classId,
    String classCode,
    Long subjectId,
    String subjectCode,
    String demandType,
    LocalDate validFrom,
    LocalDate validTo,
    BigDecimal periodsPerWeek,
    String unit,
    Long teacherId,
    String teacherCode,
    String teacherName,
    String coverageStatus,
    Boolean isLocked,
    Long lockedBy,
    OffsetDateTime lockedAt,
    String lockReason,
    String unassignedReasonCode,
    String unassignedReasonText
) {}
