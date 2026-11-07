package vn.edu.tass.backend.payload.request;

import java.time.OffsetDateTime;
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
public class TeachingQualificationRequest {
    @NotNull
    private Long teacherId;

    @NotNull
    private Long subjectId;

    @NotNull
    private Long educationLevelId;

    @NotBlank
    private String verificationStatus;

    private Long verifiedBy;

    private OffsetDateTime verifiedAt;

    private String evidenceRef;

    @NotNull
    private LocalDate validFrom;

    private LocalDate validTo;
}