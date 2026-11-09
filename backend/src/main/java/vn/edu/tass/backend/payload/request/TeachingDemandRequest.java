package vn.edu.tass.backend.payload.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class TeachingDemandRequest {
    @NotNull
    private Long semesterId;

    @NotNull
    private Long classId;

    @NotNull
    private Long subjectId;

    @NotNull
    private BigDecimal periodsPerWeek;

    @NotBlank
    private String status;

    @NotNull
    private Long updatedBy;

    @NotBlank
    private String demandType;

    @NotNull
    private LocalDate validFrom;

    @NotNull
    private LocalDate validTo;

    @NotBlank
    private String unit;
}
