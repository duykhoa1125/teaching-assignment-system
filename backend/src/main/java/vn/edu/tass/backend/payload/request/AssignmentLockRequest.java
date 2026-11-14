package vn.edu.tass.backend.payload.request;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.*;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record AssignmentLockRequest(@NotNull @PositiveOrZero Long expectedRevision,
    @NotBlank @Size(max=2000) String reason) {}
