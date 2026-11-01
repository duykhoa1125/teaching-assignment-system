package vn.edu.tass.backend.payload.request;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TeacherRequest(
    Long schoolId,
    String teacherCode,
    String fullName
) {}
