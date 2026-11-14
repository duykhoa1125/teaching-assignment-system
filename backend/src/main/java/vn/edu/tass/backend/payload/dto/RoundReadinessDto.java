package vn.edu.tass.backend.payload.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.time.LocalDate;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record RoundReadinessDto(
    long roundId, String sourceRevisionToken, Long optimizationConfigId, Long ruleSetVersionId,
    LocalDate startsOn, LocalDate endsOn, Long currentVersionId, Long revisionNo,
    boolean canRunSolver, boolean canOpenFeedback, boolean canExport,
    boolean preflightOnly, boolean solverInputValidated, Coverage coverage, List<Issue> issues
) {
    public RoundReadinessDto { issues = List.copyOf(issues); }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Coverage(long requiredComponents, long assigned, long unassigned,
                           long missingDemand, long missingPlanRow) {}

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Issue(String code, String severity, String category, String entityType,
                        Long entityId, Long relatedId, String message, String suggestion) {}
}
