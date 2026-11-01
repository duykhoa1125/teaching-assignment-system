package vn.edu.tass.backend.payload.dto;

import java.time.LocalDate;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import vn.edu.tass.backend.entity.Semester;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SemesterDto(
    Long id,
    Long academicYearId,
    Integer semesterNo,
    LocalDate startsOn,
    LocalDate endsOn
) {
    public static SemesterDto from(Semester entity) {
        return new SemesterDto(entity.id(), entity.academicYearId(), entity.semesterNo(), entity.startsOn(), entity.endsOn());
    }
}
