package vn.edu.tass.backend.payload.request;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TeachingExperienceRequest(
    Long teacherId,
    Long subjectId,
    Long gradeId,
    String experienceLevel,
    String experiencePeriod,
    Long recordedBy
) {}
