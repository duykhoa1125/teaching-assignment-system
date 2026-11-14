package vn.edu.tass.backend.payload.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.time.OffsetDateTime;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PlanVersionDto(
    long planId, long roundId, String planCode, long currentVersionId,
    long versionId, int versionNo, Long sourceVersionId, String status,
    long revisionNo, boolean isCurrent, long inputSnapshotId,
    int snapshotSchemaVersion, String snapshotContentHash,
    String sourceRevisionToken, String liveSourceRevisionToken, boolean snapshotFresh,
    long optimizationConfigId, long ruleSetVersionId, OffsetDateTime capturedAt,
    long createdBy, OffsetDateTime createdAt, long demandCount, long lockedCount
) {}
