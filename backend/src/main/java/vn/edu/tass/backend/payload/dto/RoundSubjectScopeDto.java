package vn.edu.tass.backend.payload.dto;

import java.time.OffsetDateTime;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class RoundSubjectScopeDto {
    private Long id;

    private Long roundId;

    private Long gradeId;

    private Long subjectId;

    private Long confirmedBy;

    private OffsetDateTime confirmedAt;
}