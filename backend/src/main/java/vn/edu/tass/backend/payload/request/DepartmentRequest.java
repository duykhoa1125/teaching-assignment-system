package vn.edu.tass.backend.payload.request;

import java.time.LocalDate;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record DepartmentRequest(
    Long schoolId,
    String departmentCode,
    String name,
    LocalDate validFrom,
    LocalDate validTo
) {}
