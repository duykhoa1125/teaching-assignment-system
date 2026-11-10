package vn.edu.tass.backend.payload.request;

import java.time.OffsetDateTime;
import java.time.LocalDate;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class TeachingQualificationRequest {
    @NotNull
    @Positive
    private Long teacherId;

    @NotNull
    @Positive
    private Long subjectId;

    @NotNull
    @Positive
    private Long educationLevelId;

    @NotBlank
    @Size(max = 40)
    @Schema(allowableValues = {"PENDING", "VERIFIED", "INACTIVE"})
    private String verificationStatus;

    @Positive
    private Long verifiedBy;

    private OffsetDateTime verifiedAt;

    private String evidenceRef;

    @NotNull
    private LocalDate validFrom;

    private LocalDate validTo;
}
