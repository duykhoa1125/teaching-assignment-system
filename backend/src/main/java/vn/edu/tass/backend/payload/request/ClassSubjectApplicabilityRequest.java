package vn.edu.tass.backend.payload.request;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ClassSubjectApplicabilityRequest(
    Long scopeId,
    Long classId,
    String status,
    String reason,
    Long updatedBy
) {}
