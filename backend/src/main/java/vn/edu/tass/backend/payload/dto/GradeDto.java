package vn.edu.tass.backend.payload.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import vn.edu.tass.backend.entity.Grade;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record GradeDto(
    Long id,
    Long educationLevelId,
    String gradeCode,
    String name
) {
    public static GradeDto from(Grade entity) {
        return new GradeDto(entity.id(), entity.educationLevelId(), entity.gradeCode(), entity.name());
    }
}
