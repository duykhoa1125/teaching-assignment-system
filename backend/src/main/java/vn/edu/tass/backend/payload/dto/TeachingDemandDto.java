package vn.edu.tass.backend.payload.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import vn.edu.tass.backend.entity.TeachingDemand;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TeachingDemandDto(
    Long id,
    Long semesterId,
    Long classId,
    Long subjectId,
    BigDecimal periodsPerWeek,
    String status,
    Long updatedBy,
    OffsetDateTime updatedAt,
    String demandType
) {
    public static TeachingDemandDto from(TeachingDemand entity) {
        return new TeachingDemandDto(entity.id(), entity.semesterId(), entity.classId(), entity.subjectId(), entity.periodsPerWeek(), entity.status(), entity.updatedBy(), entity.updatedAt(), entity.demandType());
    }
}
