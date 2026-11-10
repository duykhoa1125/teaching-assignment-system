package vn.edu.tass.backend.payload.request;

import java.time.OffsetDateTime;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class RoundSubjectScopeRequest {
    @NotNull
    @Positive
    private Long roundId;

    @NotNull
    @Positive
    private Long gradeId;

    @NotNull
    @Positive
    private Long subjectId;

    @Positive
    private Long confirmedBy;

    private OffsetDateTime confirmedAt;
}
