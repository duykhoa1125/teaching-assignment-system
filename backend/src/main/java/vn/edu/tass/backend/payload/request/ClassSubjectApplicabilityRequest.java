package vn.edu.tass.backend.payload.request;

import java.time.OffsetDateTime;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
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
    @Schema(allowableValues = {"APPLICABLE", "NOT_APPLICABLE", "UNDETERMINED"})
    private String status;

    private String reason;

    @NotNull
    private Long updatedBy;

    private Long confirmedBy;

    private OffsetDateTime confirmedAt;

    private Long componentsConfirmedBy;

    private OffsetDateTime componentsConfirmedAt;
}
