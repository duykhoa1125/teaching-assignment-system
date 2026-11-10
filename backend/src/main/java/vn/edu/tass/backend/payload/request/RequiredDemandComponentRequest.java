package vn.edu.tass.backend.payload.request;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class RequiredDemandComponentRequest {
    @NotNull
    @Positive
    private Long applicabilityId;

    @NotBlank
    @Size(max = 30)
    @Schema(allowableValues = {"STANDARD", "SPECIALIZED_TOPIC", "ENRICHMENT"})
    private String demandType;

    @NotNull
    private LocalDate validFrom;

    @NotNull
    private LocalDate validTo;

    @Positive
    private Long demandId;

    @Positive
    private Long confirmedBy;

    private OffsetDateTime confirmedAt;
}
