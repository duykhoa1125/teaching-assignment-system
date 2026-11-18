package vn.edu.tass.backend.payload.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.time.OffsetDateTime;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record AssignmentPlanDto(
    Long id,
    Long roundId,
    String planCode,
    Long createdBy,
    OffsetDateTime createdAt,
    CurrentVersion currentVersion
) {
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record CurrentVersion(
        Long id,
        Integer versionNo,
        String status,
        Long revisionNo,
        Long inputSnapshotId,
        String sourceRevisionToken,
        Long optimizationConfigId,
        Long ruleSetVersionId,
        Long createdBy,
        OffsetDateTime createdAt
    ) {}
}
