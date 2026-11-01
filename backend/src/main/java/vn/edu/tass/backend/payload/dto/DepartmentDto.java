package vn.edu.tass.backend.payload.dto;

import java.time.LocalDate;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import vn.edu.tass.backend.entity.Department;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record DepartmentDto(
    Long id,
    Long schoolId,
    String departmentCode,
    String name,
    LocalDate validFrom,
    LocalDate validTo
) {
    public static DepartmentDto from(Department entity) {
        return new DepartmentDto(entity.id(), entity.schoolId(), entity.departmentCode(), entity.name(), entity.validFrom(), entity.validTo());
    }
}
