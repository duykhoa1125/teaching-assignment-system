package vn.edu.tass.backend.payload.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import vn.edu.tass.backend.entity.EducationLevel;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record EducationLevelDto(
    Long id,
    String levelCode,
    String name
) {
    public static EducationLevelDto from(EducationLevel entity) {
        return new EducationLevelDto(entity.id(), entity.levelCode(), entity.name());
    }
}
