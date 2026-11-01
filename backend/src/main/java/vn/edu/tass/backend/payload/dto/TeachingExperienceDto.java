package vn.edu.tass.backend.payload.dto;

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

    private String experienceLevel;

    private String experiencePeriod;

    private Long recordedBy;

    private OffsetDateTime recordedAt;
}