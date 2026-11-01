package vn.edu.tass.backend.payload.dto;

import java.time.OffsetDateTime;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import vn.edu.tass.backend.entity.ClassSubjectApplicability;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ClassSubjectApplicabilityDto(
    Long id,
    Long scopeId,
    Long classId,
    String status,
    String reason,
    Long updatedBy,
    OffsetDateTime updatedAt
) {
    public static ClassSubjectApplicabilityDto from(ClassSubjectApplicability entity) {
        return new ClassSubjectApplicabilityDto(entity.id(), entity.scopeId(), entity.classId(), entity.status(), entity.reason(), entity.updatedBy(), entity.updatedAt());
    }
}
