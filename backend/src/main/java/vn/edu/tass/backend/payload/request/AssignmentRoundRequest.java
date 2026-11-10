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
public class AssignmentRoundRequest {
    @NotNull
    @Positive
    private Long semesterId;

    @NotBlank
    @Size(max = 50)
    private String roundCode;

    @NotBlank
    @Size(max = 40)
    private String status;

    @Positive
    private Long scopeConfirmedBy;

    private OffsetDateTime scopeConfirmedAt;

    private OffsetDateTime opensAt;

    private OffsetDateTime closesAt;
}
