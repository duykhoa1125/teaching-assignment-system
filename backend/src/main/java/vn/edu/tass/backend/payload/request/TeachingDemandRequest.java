package vn.edu.tass.backend.payload.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class TeachingDemandRequest {
    @NotNull
    @Positive
    private Long semesterId;

    @NotNull
    @Positive
    private Long classId;

    @NotNull
    @Positive
    private Long subjectId;

    @NotNull
    private BigDecimal periodsPerWeek;

    @NotBlank
    @Size(max = 40)
    private String status;

    @NotNull
    @Positive
    private Long updatedBy;

    @NotBlank
    @Size(max = 30)
    @Schema(allowableValues = {"STANDARD", "SPECIALIZED_TOPIC", "ENRICHMENT"})
    private String demandType;

    @NotNull
    private LocalDate validFrom;

    @NotNull
    private LocalDate validTo;

    @NotBlank
    @Size(max = 30)
    @Schema(allowableValues = {"PERIOD_PER_WEEK"})
    private String unit;
}
