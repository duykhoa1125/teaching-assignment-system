package vn.edu.tass.backend.payload.dto;

import java.time.LocalDate;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import vn.edu.tass.backend.entity.TeacherEmployment;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TeacherEmploymentDto(
    Long id,
    Long teacherId,
    Long departmentId,
    Long semesterId,
    String employmentStatus,
    String positionCode,
    LocalDate validFrom,
    LocalDate validTo
) {
    public static TeacherEmploymentDto from(TeacherEmployment entity) {
        return new TeacherEmploymentDto(entity.id(), entity.teacherId(), entity.departmentId(), entity.semesterId(), entity.employmentStatus(), entity.positionCode(), entity.validFrom(), entity.validTo());
    }
}
