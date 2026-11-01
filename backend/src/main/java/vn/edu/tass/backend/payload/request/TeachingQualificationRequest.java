package vn.edu.tass.backend.payload.request;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TeachingQualificationRequest(
    Long teacherId,
    Long subjectId,
    Long educationLevelId,
    String verificationStatus,
    Long verifiedBy,
    OffsetDateTime verifiedAt,
    String evidenceRef,
    LocalDate validFrom,
    LocalDate validTo
) {}
