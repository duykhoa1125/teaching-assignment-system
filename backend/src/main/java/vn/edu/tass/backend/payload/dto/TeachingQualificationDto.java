package vn.edu.tass.backend.payload.dto;

import java.time.OffsetDateTime;
import java.time.LocalDate;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class TeachingQualificationDto {
    private Long id;

    private Long teacherId;

    private Long subjectId;

    private Long educationLevelId;

    private String verificationStatus;

    private Long verifiedBy;

    private OffsetDateTime verifiedAt;

    private String evidenceRef;

    private LocalDate validFrom;

    private LocalDate validTo;
}