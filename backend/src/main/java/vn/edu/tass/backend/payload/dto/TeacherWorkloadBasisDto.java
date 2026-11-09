package vn.edu.tass.backend.payload.dto;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class TeacherWorkloadBasisDto {
    private Long id;

    private Long teacherId;

    private Long semesterId;

    private Long educationLevelId;

    private String positionCode;

    private BigDecimal basePeriodsPerWeek;

    private String unit;

    private LocalDate validFrom;

    private LocalDate validTo;

    private String profileRef;

    private Long ruleDefinitionId;

    private Long sourceImportId;

    private String verificationStatus;

    private Long verifiedBy;

    private OffsetDateTime verifiedAt;
}
