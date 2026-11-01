package vn.edu.tass.backend.payload.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import vn.edu.tass.backend.entity.School;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SchoolDto(
    Long id,
    String schoolCode,
    String name,
    String status
) {
    public static SchoolDto from(School entity) {
        return new SchoolDto(entity.id(), entity.schoolCode(), entity.name(), entity.status());
    }
}
