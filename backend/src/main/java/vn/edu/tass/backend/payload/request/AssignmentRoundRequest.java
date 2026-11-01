package vn.edu.tass.backend.payload.request;

import java.time.OffsetDateTime;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class AssignmentRoundRequest {
    @NotNull
    private Long semesterId;

    @NotBlank
    private String roundCode;

    @NotBlank
    private String status;

    private Long scopeConfirmedBy;

    private OffsetDateTime scopeConfirmedAt;

    private OffsetDateTime opensAt;

    private OffsetDateTime closesAt;
}