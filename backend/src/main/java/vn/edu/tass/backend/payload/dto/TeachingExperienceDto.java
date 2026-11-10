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
public class TeachingExperienceDto {
    private Long id;

    private Long teacherId;

    private Long subjectId;

    private Long gradeId;

    private Long recordedBy;

    private OffsetDateTime recordedAt;

    private String experienceStatus;

    private BigDecimal yearsOfExperience;

    private LocalDate asOfDate;

    private String evidenceRef;

    private Long sourceImportId;

    private Long verifiedBy;

    private OffsetDateTime verifiedAt;
}
