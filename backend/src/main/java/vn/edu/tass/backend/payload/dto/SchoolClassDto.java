package vn.edu.tass.backend.payload.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import vn.edu.tass.backend.entity.SchoolClass;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SchoolClassDto(
    Long id,
    Long academicYearId,
    Long gradeId,
    String classCode,
    String status
) {
    public static SchoolClassDto from(SchoolClass entity) {
        return new SchoolClassDto(entity.id(), entity.academicYearId(), entity.gradeId(), entity.classCode(), entity.status());
    }
}
