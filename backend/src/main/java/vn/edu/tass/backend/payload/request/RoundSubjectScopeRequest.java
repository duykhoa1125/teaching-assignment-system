package vn.edu.tass.backend.payload.request;

import java.time.OffsetDateTime;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record RoundSubjectScopeRequest(
    Long roundId,
    Long gradeId,
    Long subjectId,
    Long confirmedBy,
    OffsetDateTime confirmedAt
) {}
