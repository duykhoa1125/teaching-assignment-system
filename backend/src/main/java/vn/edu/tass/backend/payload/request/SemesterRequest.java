package vn.edu.tass.backend.payload.request;

import java.time.LocalDate;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SemesterRequest(
    Long academicYearId,
    Integer semesterNo,
    LocalDate startsOn,
    LocalDate endsOn
) {}
