package vn.edu.tass.backend.payload.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ReadinessScopeDto(
    Long scopeId,
    Long gradeId,
    Long subjectId,
    boolean confirmed,
    long classCount,
    long applicableCount,
    long notApplicableCount,
    long undeterminedCount,
    long missingApplicabilityCount,
    long applicableMissingDemandCount
) {
}
