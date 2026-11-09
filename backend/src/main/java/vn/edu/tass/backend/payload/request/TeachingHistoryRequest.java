package vn.edu.tass.backend.payload.request;
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
public class TeachingHistoryRequest {
    @NotNull
    @Positive
    private Long teacherId;

    @NotNull
    @Positive
    private Long academicYearId;

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
    private LocalDate taughtFrom;

    @NotNull
    private LocalDate taughtTo;

    @NotBlank
    @Size(max = 30)
    @Schema(allowableValues = {"EXTERNAL_RECORD", "CONFIRMED_ACTUAL"})
    private String sourceKind;

    @Positive
    private Long sourceImportId;

    @Positive
    private Long sourcePlanDemandId;

    @NotBlank
    private String evidenceRef;

    @NotBlank
    @Size(max = 30)
    @Schema(allowableValues = {"PENDING", "VERIFIED", "REJECTED"})
    private String verificationStatus;

    @Positive
    private Long verifiedBy;

    private OffsetDateTime verifiedAt;

    @NotNull
    @Positive
    private Long recordedBy;
}
