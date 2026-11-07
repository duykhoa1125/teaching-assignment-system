package vn.edu.tass.backend.payload.request;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
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

    private Long gradeId;

    @NotBlank
    private String experienceLevel;

    @NotBlank
    private String experiencePeriod;

    @NotNull
    private Long recordedBy;
}