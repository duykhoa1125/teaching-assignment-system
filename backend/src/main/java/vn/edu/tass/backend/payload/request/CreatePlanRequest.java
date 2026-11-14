package vn.edu.tass.backend.payload.request;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record CreatePlanRequest(
    @NotNull @Positive Long optimizationConfigId,
    @NotNull @Positive Long ruleSetVersionId
) {}
