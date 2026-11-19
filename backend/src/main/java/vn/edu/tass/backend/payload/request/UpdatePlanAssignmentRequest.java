package vn.edu.tass.backend.payload.request;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record UpdatePlanAssignmentRequest(
    @NotNull @Min(0) Long expectedRevisionNo,
    @NotBlank @Size(max = 255) String sourceRevisionToken,
    @Positive Long teacherId,
    @Size(max = 80) String unassignedReasonCode,
    String unassignedReasonText
) {}
