package vn.edu.tass.backend.payload.request;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.*;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record StartSolverRunRequest(@NotNull @PositiveOrZero Long expectedRevision,
    @NotNull @Positive Long optimizationConfigId, @NotNull @Positive Long ruleSetVersionId) {}
