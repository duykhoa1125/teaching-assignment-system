package vn.edu.tass.backend.payload.dto;

import java.time.OffsetDateTime;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import vn.edu.tass.backend.entity.TeachingExperience;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TeachingExperienceDto(
    Long id,
    Long teacherId,
    Long subjectId,
    Long gradeId,
    String experienceLevel,
    String experiencePeriod,
    Long recordedBy,
    OffsetDateTime recordedAt
) {
    public static TeachingExperienceDto from(TeachingExperience entity) {
        return new TeachingExperienceDto(entity.id(), entity.teacherId(), entity.subjectId(), entity.gradeId(), entity.experienceLevel(), entity.experiencePeriod(), entity.recordedBy(), entity.recordedAt());
    }
}
