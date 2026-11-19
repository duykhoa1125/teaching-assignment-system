package vn.edu.tass.backend.payload.request;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record CreateAssignmentPlanRequest(
    @NotBlank @Size(max = 80) String planCode,
    @NotNull @Positive Long createdBy,
    @NotNull @Positive Long optimizationConfigId,
    @NotNull @Positive Long ruleSetVersionId,
    @NotBlank @Size(max = 255) String sourceRevisionToken
) {}
