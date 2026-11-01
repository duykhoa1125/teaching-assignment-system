package vn.edu.tass.backend.payload.request;

import java.time.OffsetDateTime;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record AssignmentRoundRequest(
    Long semesterId,
    String roundCode,
    String status,
    Long scopeConfirmedBy,
    OffsetDateTime scopeConfirmedAt,
    OffsetDateTime opensAt,
    OffsetDateTime closesAt
) {}
