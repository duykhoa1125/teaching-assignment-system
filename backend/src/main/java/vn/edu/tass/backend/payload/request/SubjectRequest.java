package vn.edu.tass.backend.payload.request;

import java.time.LocalDate;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SubjectRequest(
    String subjectCode,
    String name,
    LocalDate validFrom,
    LocalDate validTo
) {}
