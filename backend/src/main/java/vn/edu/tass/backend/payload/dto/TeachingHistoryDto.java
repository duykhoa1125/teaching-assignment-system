package vn.edu.tass.backend.payload.dto;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class TeachingHistoryDto {
    private Long id;

    private Long teacherId;

    private Long academicYearId;

    private Long semesterId;

    private Long classId;

    private Long subjectId;

    private LocalDate taughtFrom;

    private LocalDate taughtTo;

    private String sourceKind;

    private Long sourceImportId;

    private Long sourcePlanDemandId;

    private String evidenceRef;

    private String verificationStatus;

    private Long verifiedBy;

    private OffsetDateTime verifiedAt;

    private Long recordedBy;

    private OffsetDateTime recordedAt;
}
