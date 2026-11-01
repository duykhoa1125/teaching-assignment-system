package vn.edu.tass.backend.payload.dto;

import java.time.OffsetDateTime;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import vn.edu.tass.backend.entity.AssignmentRound;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record AssignmentRoundDto(
    Long id,
    Long semesterId,
    String roundCode,
    String status,
    Long scopeConfirmedBy,
    OffsetDateTime scopeConfirmedAt,
    OffsetDateTime opensAt,
    OffsetDateTime closesAt
) {
    public static AssignmentRoundDto from(AssignmentRound entity) {
        return new AssignmentRoundDto(entity.id(), entity.semesterId(), entity.roundCode(), entity.status(), entity.scopeConfirmedBy(), entity.scopeConfirmedAt(), entity.opensAt(), entity.closesAt());
    }
}
