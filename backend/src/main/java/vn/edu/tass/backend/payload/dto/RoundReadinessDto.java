package vn.edu.tass.backend.payload.dto;

import java.util.List;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record RoundReadinessDto(
    Long roundId,
    Long semesterId,
    String sourceRevisionToken,
    boolean canRunSolver,
    List<ReadinessScopeDto> scopeSummaries,
    List<ReadinessIssueDto> missingData,
    List<ReadinessIssueDto> incompleteComponents,
    List<ReadinessIssueDto> warnings
) {
    public RoundReadinessDto {
        scopeSummaries = List.copyOf(scopeSummaries);
        missingData = List.copyOf(missingData);
        incompleteComponents = List.copyOf(incompleteComponents);
        warnings = List.copyOf(warnings);
    }
}
