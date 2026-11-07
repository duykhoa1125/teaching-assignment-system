package vn.edu.tass.backend.payload.request;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class ClassSubjectApplicabilityRequest {
    @NotNull
    private Long scopeId;

    @NotNull
    private Long classId;

    @NotBlank
    private String status;

    private String reason;

    @NotNull
    private Long updatedBy;
}