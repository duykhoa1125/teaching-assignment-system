package vn.edu.tass.backend.payload.dto;

import java.time.LocalDate;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import vn.edu.tass.backend.entity.AcademicYear;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record AcademicYearDto(
    Long id,
    Long schoolId,
    String yearCode,
    LocalDate startsOn,
    LocalDate endsOn
) {
    public static AcademicYearDto from(AcademicYear entity) {
        return new AcademicYearDto(entity.id(), entity.schoolId(), entity.yearCode(), entity.startsOn(), entity.endsOn());
    }
}
