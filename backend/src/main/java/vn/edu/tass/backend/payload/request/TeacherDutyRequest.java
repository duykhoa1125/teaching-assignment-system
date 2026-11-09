package vn.edu.tass.backend.payload.request;
import java.time.LocalDate;
import java.math.BigDecimal;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class TeacherDutyRequest {
    @NotNull
    @Positive
    private Long teacherId;

    @NotNull
    @Positive
    private Long semesterId;

    @NotNull
    @Positive
    private Long ruleDefinitionId;

    @NotBlank
    @Size(max = 60)
    private String dutyType;

    @Positive
    private Long classId;

    @NotBlank
    private String scopeDescription;

    @NotNull
    private LocalDate validFrom;

    private LocalDate validTo;

    private BigDecimal reductionValue;

    @NotBlank
    @Size(max = 40)
    private String verificationStatus;

    @NotBlank
    @Size(max = 40)
    private String paymentStatus;

    private String evidenceRef;

    @Positive
    private Long verifiedBy;
}
