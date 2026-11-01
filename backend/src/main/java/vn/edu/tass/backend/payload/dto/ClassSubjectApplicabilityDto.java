package vn.edu.tass.backend.payload.dto;

import java.time.OffsetDateTime;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class ClassSubjectApplicabilityDto {
    private Long id;

    private Long scopeId;

    private Long classId;

    private String status;

    private String reason;

    private Long updatedBy;

    private OffsetDateTime updatedAt;
}