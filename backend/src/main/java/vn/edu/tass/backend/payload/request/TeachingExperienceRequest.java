package vn.edu.tass.backend.payload.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class TeachingExperienceRequest {
    @NotNull
    @Positive
    private Long teacherId;

    @NotNull
    @Positive
    private Long subjectId;

    @NotNull
    @Positive
    private Long gradeId;

    @NotBlank
    @Size(max = 30)
    private String experienceStatus;

    private BigDecimal yearsOfExperience;

    @NotNull
    private LocalDate asOfDate;

    private String evidenceRef;

    @Positive
    private Long sourceImportId;

    @Positive
    private Long verifiedBy;

    private OffsetDateTime verifiedAt;

    @NotNull
    @Positive
    private Long recordedBy;
}
