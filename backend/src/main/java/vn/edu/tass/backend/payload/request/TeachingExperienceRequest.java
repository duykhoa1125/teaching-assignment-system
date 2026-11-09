package vn.edu.tass.backend.payload.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class TeachingExperienceRequest {
    @NotNull
    private Long teacherId;

    @NotNull
    private Long subjectId;

    @NotNull
    private Long gradeId;

    @NotBlank
    @Schema(allowableValues = {"UNKNOWN", "NO_EXPERIENCE", "HAS_EXPERIENCE"})
    private String experienceStatus;

    private BigDecimal yearsOfExperience;

    @NotNull
    private LocalDate asOfDate;

    private String evidenceRef;

    private Long sourceImportId;

    private Long verifiedBy;

    private OffsetDateTime verifiedAt;

    @NotNull
    private Long recordedBy;
}
