package vn.edu.tass.solver;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/** Solver DTOs, NOT JPA entities or inferred ERD columns. See docs/CONTRACT.md. */
public final class Contract {
    private Contract() {}
    static <T> List<T> list(List<T> v) { return v == null ? List.of() : List.copyOf(v); }
    static <K,V> Map<K,V> map(Map<K,V> v) { return v == null ? Map.of() : Collections.unmodifiableMap(new LinkedHashMap<>(v)); }
    public enum DemandType { STANDARD, SPECIALIZED_TOPIC }
    public enum Applicability { APPLICABLE, NOT_APPLICABLE, UNDETERMINED }
    public enum EmploymentStatus { ACTIVE, FULL_TERM_LEAVE }
    public enum CheckStatus { PASS, VIOLATION, INSUFFICIENT_DATA, NOT_APPLICABLE }
    public enum CheckPeriod { WEEKLY, ANNUAL }
    public enum CoverageMode { COMPONENTS, PERIODS, COMPLETE_GROUPS }
    public enum DeviationBasis { A, W }
    public enum PreservePolicy { REOPTIMIZE, PENALIZE_CHANGES }
    public enum LoadBasis { FIXED_WEEKLY, AVERAGE_WEEKLY }

    public record Identity(String schoolId, String semesterId, String roundId, String planId,
                           String versionId, long baseRevision, String snapshotId,
                           String sourceRevisionToken, String ruleSetVersion, String optimizationConfigVersion) {}
    public record Period(LocalDate startsOn, LocalDate endsOn) {}
    public record Normalization(long integerScale, String unit, LoadBasis basis, String roundingRule) {}
    public record Config(CoverageMode coverageMode, DeviationBasis deviationBasis, PreservePolicy preservePolicy,
                         long loadWeight, long experienceWeight, long changeWeight,
                         double totalSeconds, double phaseOneSeconds, double phaseTwoSeconds,
                         int workers, int seed, String decisionSource, boolean demoAssumptions) {}
    public record Scope(String classId, String className, String subjectId, String subjectName,
                        String gradeId, String levelId, Applicability status,
                        List<DemandType> requiredTypes, String confirmationSource) {
        public Scope { requiredTypes = list(requiredTypes); }
        public String key() { return classId + "\u001f" + subjectId; }
    }
    public record Demand(String id, String classId, String subjectId, String semesterId,
                         DemandType type, BigDecimal periods, String source) {
        public String groupKey() { return classId + "\u001f" + subjectId; }
    }
    public record Employment(String schoolId, String semesterId, LocalDate startsOn, LocalDate endsOn,
                             EmploymentStatus status, String source) {}
    public record Qualification(String subjectId, String levelId, LocalDate startsOn, LocalDate endsOn,
                                boolean verified, String source) {}
    /** B/R/F/C are rule-service outputs. Evidence is checked via the mandatory prechecks. */
    public record Workload(BigDecimal base, BigDecimal reduction, BigDecimal fixedOutside,
                           BigDecimal converted, boolean targetApplicable, String source,
                           String selectedBaseline, List<String> outsideDemandIds) {
        public Workload { outsideDemandIds = list(outsideDemandIds); }
    }
    /** Every coefficient is explicit in the check's OWN unit and calculation period. */
    public record HardCheck(String id, String ruleId, CheckPeriod period, String calculationPeriod,
                            String unit, CheckStatus dataStatus, BigDecimal fixed, BigDecimal converted,
                            Map<String,BigDecimal> coefficients, BigDecimal limit,
                            List<String> missingData, String source) {
        public HardCheck { coefficients = map(coefficients); missingData = list(missingData); }
    }
    public record Teacher(String id, String name, List<Employment> employments,
                          List<Qualification> qualifications, Workload workload,
                          Map<String,Long> experiencePenalties, List<HardCheck> hardChecks) {
        public Teacher { employments=list(employments); qualifications=list(qualifications);
            experiencePenalties=map(experiencePenalties); hardChecks=list(hardChecks); }
    }
    public record Precheck(String ruleId, CheckStatus status, String source, String explanation) {}
    public record PreviousAssignment(String demandId, String teacherId) {}
    public record Snapshot(String schemaVersion, Identity identity, Period period, Normalization normalization,
                           Config config, List<Scope> scopes, List<Demand> demands, List<Teacher> teachers,
                           List<PreviousAssignment> previousAssignments, String previousSource,
                           List<Precheck> prechecks, String hardCheckInventorySource) {
        public Snapshot { scopes=list(scopes); demands=list(demands); teachers=list(teachers);
            previousAssignments=list(previousAssignments); prechecks=list(prechecks); }
    }
    public record Issue(String code, String path, String message) {}
    public record Assignment(String demandId, String classId, String subjectId, DemandType type,
                             BigDecimal periods, String teacherId, String reasonCode, String reason,
                             List<String> evidence) {
        public Assignment { evidence=list(evidence); }
    }
    public record Load(String teacherId, BigDecimal B, BigDecimal R, BigDecimal Q, BigDecimal A,
                       BigDecimal F, BigDecimal C, BigDecimal W, BigDecimal deltaA, BigDecimal deltaW,
                       BigDecimal under, BigDecimal over, boolean targetApplicable) {}
    public record CheckResult(String teacherId, String checkId, String ruleId, CheckPeriod period,
                              String calculationPeriod, String unit, CheckStatus status, BigDecimal value,
                              BigDecimal limit, List<String> missingData) {
        public CheckResult { missingData=list(missingData); }
    }
    public record Metrics(int totalComponents, int assignedComponents, int unassignedComponents,
                          BigDecimal totalPeriods, BigDecimal assignedPeriods, BigDecimal missingPeriods,
                          int totalGroups, int completeGroups, int incompleteGroups,
                          BigDecimal loadDeviation, long experiencePenalty, long changes,
                          int addedDemands, int removedDemands, long coverageObjective, long softObjective,
                          boolean fullCoverageImpossibleProven) {}
    public record Phase(String name, String status, String stopReason, Long objective,
                        Double bestBound, double seconds, boolean exactOptimalityProven) {}
    public record Result(String status, Identity identity, String snapshotHash, List<Issue> errors,
                         List<Assignment> assignments, List<Load> loads, List<CheckResult> checks,
                         Metrics metrics, List<Phase> phases, String selectedPhase,
                         boolean coverageOptimalityProven, boolean softOptimalityProven,
                         boolean dataReadyForOpening, List<String> warnings,
                         double elapsedSeconds, boolean budgetExceeded, String solverVersion,
                         int variableCount, int constraintCount) {
        public Result { errors=list(errors); assignments=list(assignments); loads=list(loads);
            checks=list(checks); phases=list(phases); warnings=list(warnings); }
        public boolean hasCandidate() { return status.equals("OPTIMAL") || status.equals("FEASIBLE"); }
    }
}
