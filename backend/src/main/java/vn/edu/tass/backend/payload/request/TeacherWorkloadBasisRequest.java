package vn.edu.tass.backend.payload.request;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
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
public class TeacherWorkloadBasisRequest {
    @NotNull
    @Positive
    private Long teacherId;

    @NotNull
    @Positive
    private Long semesterId;

    @NotNull
    @Positive
    private Long educationLevelId;

    @NotBlank
    @Size(max = 50)
    private String positionCode;

    @NotNull
    private BigDecimal basePeriodsPerWeek;

    @NotBlank
    @Size(max = 30)
    @Schema(allowableValues = {"PERIOD_PER_WEEK"})
    private String unit;

    @NotNull
    private LocalDate validFrom;

    @NotNull
    private LocalDate validTo;

    @NotBlank
    private String profileRef;

    @Positive
    private Long ruleDefinitionId;

    @Positive
    private Long sourceImportId;

    @NotBlank
    @Size(max = 30)
    @Schema(allowableValues = {"PENDING", "VERIFIED", "REJECTED"})
    private String verificationStatus;

    @Positive
    private Long verifiedBy;

    private OffsetDateTime verifiedAt;
}
