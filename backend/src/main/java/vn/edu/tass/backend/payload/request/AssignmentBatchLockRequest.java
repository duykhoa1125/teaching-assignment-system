package vn.edu.tass.backend.payload.request;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Schema(description="Select exactly one: assignment_ids (plan_demand row IDs), OR class_id together with subject_id for the entire captured group. All rows are processed atomically.")
public record AssignmentBatchLockRequest(@NotNull @PositiveOrZero Long expectedRevision,
    @NotBlank @Size(max=2000) String reason,
    @Size(min=1,max=2000) List<@NotNull @Positive Long> assignmentIds,
    @Positive Long classId,@Positive Long subjectId) {}
