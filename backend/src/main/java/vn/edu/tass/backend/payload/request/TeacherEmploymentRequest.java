package vn.edu.tass.backend.payload.request;

import java.time.LocalDate;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TeacherEmploymentRequest(
    Long teacherId,
    Long departmentId,
    Long semesterId,
    String employmentStatus,
    String positionCode,
    LocalDate validFrom,
    LocalDate validTo
) {}
