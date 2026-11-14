package vn.edu.tass.backend.payload.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

public final class PlanResultDto {
    private PlanResultDto() {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record VersionContext(long versionId,long revisionNo,long inputSnapshotId,String sourceRevisionToken,
        boolean snapshotFresh,boolean currentVersion) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record AssignmentRow(long id,long demandId,long classId,String className,long subjectId,String subjectName,
        String demandType,BigDecimal periodsPerWeek,LocalDate validFrom,LocalDate validTo,Long teacherId,String teacherName,
        boolean locked,Long lockedBy,OffsetDateTime lockedAt,String lockReason,String unassignedReasonCode,String unassignedReasonText) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record AssignmentPage(VersionContext version,long total,int limit,int offset,List<AssignmentRow> items) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Finding(String brCode,String subjectType,String subjectRef,String calculationPeriod,String resultStatus,
        String severity,List<String> missingData,String message,JsonNode details) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record WorkloadRow(long teacherId,String teacherName,BigDecimal b,BigDecimal f,BigDecimal a,BigDecimal c,BigDecimal r,
        BigDecimal q,BigDecimal w,BigDecimal t,BigDecimal deltaT,BigDecimal under,BigDecimal over,boolean targetApplicable,List<Finding> checks) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Coverage(long required,long assigned,long unassigned) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record WorkloadPage(VersionContext version,long total,int limit,int offset,List<WorkloadRow> items,
        Coverage coverage,String overallStatus,List<String> warnings) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record ValidationReport(long id,long versionId,long revisionNo,long inputSnapshotId,String sourceRevisionToken,
        OffsetDateTime checkedAt,Long checkedBy,String overallStatus,boolean fresh,String validatorVersion,
        List<Finding> results,List<WorkloadRow> workloads,JsonNode summary) {}
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record OptimizationView(VersionContext version,Long latestRunId,SolverRunDto run,boolean matchesVersion,
        JsonNode configuration,JsonNode objectiveVector,List<String> warnings) {}
}
