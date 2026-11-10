package vn.edu.tass.backend.payload.request;

import java.time.LocalDate;
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
public class RequiredDemandComponentRequest {
    @NotNull
    @Positive
    private Long applicabilityId;

    @NotBlank
    @Size(max = 30)
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
