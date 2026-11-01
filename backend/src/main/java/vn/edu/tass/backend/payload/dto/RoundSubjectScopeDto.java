package vn.edu.tass.backend.payload.dto;

import java.time.OffsetDateTime;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import vn.edu.tass.backend.entity.RoundSubjectScope;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record RoundSubjectScopeDto(
    Long id,
    Long roundId,
    Long gradeId,
    Long subjectId,
    Long confirmedBy,
    OffsetDateTime confirmedAt
) {
    public static RoundSubjectScopeDto from(RoundSubjectScope entity) {
        return new RoundSubjectScopeDto(entity.id(), entity.roundId(), entity.gradeId(), entity.subjectId(), entity.confirmedBy(), entity.confirmedAt());
    }
}
