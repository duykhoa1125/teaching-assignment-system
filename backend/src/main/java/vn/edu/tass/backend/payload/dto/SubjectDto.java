package vn.edu.tass.backend.payload.dto;

import java.time.LocalDate;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import vn.edu.tass.backend.entity.Subject;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SubjectDto(
    Long id,
    String subjectCode,
    String name,
    LocalDate validFrom,
    LocalDate validTo
) {
    public static SubjectDto from(Subject entity) {
        return new SubjectDto(entity.id(), entity.subjectCode(), entity.name(), entity.validFrom(), entity.validTo());
    }
}
