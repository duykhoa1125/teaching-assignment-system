package vn.edu.tass.backend.payload.dto;
import java.time.LocalDate;
import java.math.BigDecimal;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class TeacherDutyDto {
    private Long id;

    private Long teacherId;

    private Long semesterId;

    private Long ruleDefinitionId;

    private String dutyType;

    private Long classId;

    private String scopeDescription;

    private LocalDate validFrom;

    private LocalDate validTo;

    private BigDecimal reductionValue;

    private String verificationStatus;

    private String paymentStatus;

    private String evidenceRef;

    private Long verifiedBy;
}
