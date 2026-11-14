package vn.edu.tass.backend.payload.dto;

import java.time.OffsetDateTime;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SolverRunDto(long id,long versionId,long baseRevision,long requestedBy,String status,
    OffsetDateTime queuedAt,OffsetDateTime executionStartedAt,OffsetDateTime finishedAt,
    OffsetDateTime cancellationRequestedAt,Long preparationMs,Long solveMs,Long archiveWriteMs,
    String failureCode,String inputHash,boolean inputFresh,Long appliedRevisionNo,Long applyMs,JsonNode summary) {}
