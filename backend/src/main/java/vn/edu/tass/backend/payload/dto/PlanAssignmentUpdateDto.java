package vn.edu.tass.backend.payload.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PlanAssignmentUpdateDto(
    long planVersionId,
    long revisionNo,
    long planDemandId,
    long demandId,
    Long teacherId,
    String coverageStatus,
    boolean isLocked,
    String unassignedReasonCode,
    String unassignedReasonText
) {}
