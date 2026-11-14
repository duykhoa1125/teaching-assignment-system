package vn.edu.tass.backend.payload.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record UpdateAssignmentRequest(
    @NotNull @PositiveOrZero Long expectedRevision,
    @JsonProperty(value="teacher_id",required=true)
    @Schema(description="Required property. Positive teacher ID, or explicit null to unassign. Does not change demand periods.",nullable=true)
    @Positive Long teacherId,
    @Size(max=80) String unassignedReasonCode,
    @Size(max=2000) String unassignedReasonText,
    @NotBlank @Size(max=2000) String changeReason
) {}
