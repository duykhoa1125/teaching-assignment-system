package vn.edu.tass.backend.payload.request;

import java.time.OffsetDateTime;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class RoundSubjectScopeRequest {
    @NotNull
    private Long roundId;

    @NotNull
    private Long gradeId;

    @NotNull
    private Long subjectId;

    private Long confirmedBy;

    private OffsetDateTime confirmedAt;
}