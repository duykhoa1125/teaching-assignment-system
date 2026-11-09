package vn.edu.tass.backend.payload.request;

import java.time.LocalDate;
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
public class RequiredDemandComponentRequest {
    @NotNull
    private Long applicabilityId;

    @NotBlank
    private String demandType;

    @NotNull
    private LocalDate validFrom;

    @NotNull
    private LocalDate validTo;

    private Long demandId;

    private Long confirmedBy;

    private OffsetDateTime confirmedAt;
}
