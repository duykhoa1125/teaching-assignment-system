package vn.edu.tass.backend.payload.request;

import java.time.OffsetDateTime;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class ClassSubjectApplicabilityRequest {
    @NotNull
    @Positive
    private Long scopeId;

    @NotNull
    @Positive
    private Long classId;

    @NotBlank
    @Size(max = 30)
    private String status;

    private String reason;

    @NotNull
    @Positive
    private Long updatedBy;

    @Positive
    private Long confirmedBy;

    private OffsetDateTime confirmedAt;

    @Positive
    private Long componentsConfirmedBy;

    private OffsetDateTime componentsConfirmedAt;
}
