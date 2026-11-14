package vn.edu.tass.backend.solver;

import java.math.BigDecimal;
import java.util.*;
import org.springframework.stereotype.Component;
import vn.edu.tass.backend.payload.dto.PlanResultDto.*;
import vn.edu.tass.backend.payload.dto.PlanVersionDto;
import vn.edu.tass.backend.repository.SolverInputRepository;
import vn.edu.tass.backend.repository.WorkloadSourceRepository;
import vn.edu.tass.solver.Contract;
import vn.edu.tass.solver.Json;
import static vn.edu.tass.backend.solver.CapturedWorkloadData.*;

/** Report saved decisions, including violations, using the same captured workload/check inputs as the solver. */
@Component
public class PlanValidationEvaluator {
    public record Evaluation(List<WorkloadRow> workloads,List<Finding> findings,Coverage coverage,List<String> warnings,String status) {}
    private final DbWorkloadPreparer workloads;
    private final SolverSnapshotMapper mapper;
    public PlanValidationEvaluator(DbWorkloadPreparer workloads,SolverSnapshotMapper mapper) { this.workloads=workloads; this.mapper=mapper; }
    public Evaluation evaluate(WorkloadSourceRepository.Captured captured,PlanVersionDto version,List<AssignmentRow> rows) {
        var prepared=workloads.prepare(captured.id());
        var root=parse(captured.payload()); var demands=index(root,"demands"); var classes=index(root,"classes"); var grades=index(root,"grades");
        String period="SEMESTER:"+id(root.path("semester"),"id");
        List<Finding> findings=new ArrayList<>();
        // Certify scope, precision, units and full input contract as for solver execution.
        try { mapper.map(captured,version,rows.stream().map(a->new SolverInputRepository.Assignment(a.demandId(),a.teacherId(),a.locked(),a.lockedBy(),a.lockedAt(),a.lockReason())).toList(),SolverSnapshotMapper.RuntimeOptions.defaults()); }
        catch (WorkloadInputException e) {
            if (!e.code().equals("LOCK_CONFLICT")) throw e;
            findings.add(finding("LOCK_CONFLICT","PLAN_VERSION",Long.toString(version.versionId()),period,"VIOLATION",List.of(),e.getMessage(),null));
        }
        Map<Long,AssignmentRow> byDemand=new HashMap<>(); Map<Long,BigDecimal> assigned=new HashMap<>();
        for(var row:rows) {
            byDemand.put(row.demandId(),row);
            var demand=demands.get(row.demandId());
            if(demand==null || number(demand,"periods_per_week").compareTo(row.periodsPerWeek())!=0) {
                findings.add(finding("ASSIGNMENT_CONTEXT","PLAN_DEMAND",Long.toString(row.id()),period,"VIOLATION",List.of(),"Saved demand/periods differ from snapshot",null)); continue;
            }
            if(row.teacherId()==null) continue;
            var teacher=prepared.teachers().get(row.teacherId());
            var classroom=classes.get(row.classId()); var grade=classroom==null?null:grades.get(id(classroom,"grade_id"));
            String level=grade==null?null:Long.toString(id(grade,"education_level_id"));
            boolean eligible=teacher!=null && teacher.employments().stream().anyMatch(e->e.status()==Contract.EmploymentStatus.ACTIVE
                && !e.startsOn().isAfter(prepared.period().startsOn()) && !e.endsOn().isBefore(prepared.period().endsOn()))
                && teacher.qualifications().stream().anyMatch(q->q.verified() && q.subjectId().equals(Long.toString(row.subjectId()))
                    && q.levelId().equals(level) && !q.startsOn().isAfter(prepared.period().startsOn()) && !q.endsOn().isBefore(prepared.period().endsOn()));
            findings.add(finding("ASSIGNMENT_ELIGIBILITY","PLAN_DEMAND",Long.toString(row.id()),period,eligible?"PASS":"VIOLATION",List.of(),
                eligible?"Eligible over the entire captured interval":"Teacher is not eligible over the captured interval",null));
            assigned.merge(row.teacherId(),row.periodsPerWeek(),BigDecimal::add);
        }
        long count=demands.keySet().stream().filter(d->byDemand.containsKey(d)&&byDemand.get(d).teacherId()!=null).count();
        var coverage=new Coverage(demands.size(),count,demands.size()-count);
        boolean complete=demands.size()==rows.size() && byDemand.keySet().equals(demands.keySet()) && count==demands.size();
        findings.add(finding("REQUIRED_COVERAGE","PLAN_VERSION",Long.toString(version.versionId()),period,complete?"PASS":"VIOLATION",List.of(),
            complete?"All captured required components assigned":"Required components are missing or unassigned; draft may remain partial",Json.MAPPER.valueToTree(coverage)));
        for(var check:prepared.prechecks()) {
            String status=check.status()==Contract.CheckStatus.NOT_APPLICABLE?"PASS":check.status().name();
            var details=Json.MAPPER.createObjectNode().put("original_status",check.status().name()).put("source",check.source());
            findings.add(finding(check.ruleId(),"PLAN_VERSION",Long.toString(version.versionId()),period,status,
                status.equals("INSUFFICIENT_DATA")?List.of(check.explanation()):List.of(),check.explanation(),details));
        }
        List<WorkloadRow> loads=new ArrayList<>();
        for(var teacher:prepared.teachers().values()) {
            var value=WorkloadMath.evaluate(Long.toString(teacher.id()),teacher.workload(),assigned.getOrDefault(teacher.id(),BigDecimal.ZERO));
            List<Finding> checks=new ArrayList<>();
            for(var check:teacher.hardChecks()) {
                BigDecimal actual=null; var status=check.dataStatus();
                if(status==Contract.CheckStatus.PASS) {
                    actual=check.fixed().add(check.converted());
                    for(var row:rows) if(Objects.equals(row.teacherId(),teacher.id())) actual=actual.add(check.coefficients().get(Long.toString(row.demandId())));
                    if(actual.compareTo(check.limit())>0) status=Contract.CheckStatus.VIOLATION;
                }
                var details=Json.MAPPER.createObjectNode().put("check_id",check.id()).put("unit",check.unit()).put("original_status",status.name()).put("source",check.source());
                details.set("value",Json.MAPPER.valueToTree(actual)); details.set("limit",Json.MAPPER.valueToTree(check.limit()));
                checks.add(finding(check.ruleId(),"TEACHER",Long.toString(teacher.id()),check.calculationPeriod(),status==Contract.CheckStatus.NOT_APPLICABLE?"PASS":status.name(),check.missingData(),
                    "Captured "+check.id()+" check: "+status.name(),details));
            }
            findings.addAll(checks);
            loads.add(new WorkloadRow(teacher.id(),teacher.name(),value.B(),value.F(),value.A(),value.C(),value.R(),value.Q(),value.W(),value.T(),value.deltaT(),value.under(),value.over(),value.targetApplicable(),checks));
        }
        findings.sort(Comparator.comparing(Finding::brCode).thenComparing(Finding::subjectType).thenComparing(Finding::subjectRef).thenComparing(Finding::calculationPeriod));
        String status=findings.stream().anyMatch(f->f.resultStatus().equals("VIOLATION"))?"VIOLATION":
            findings.stream().anyMatch(f->f.resultStatus().equals("INSUFFICIENT_DATA"))?"INSUFFICIENT_DATA":"PASS";
        return new Evaluation(List.copyOf(loads),List.copyOf(findings),coverage,prepared.warnings(),status);
    }
    private static Finding finding(String code,String type,String ref,String period,String status,List<String> missing,String message,com.fasterxml.jackson.databind.JsonNode details) {
        return new Finding(code,type,ref,period,status,status.equals("VIOLATION")?"ERROR":status.equals("INSUFFICIENT_DATA")?"WARNING":"INFO",missing,message,details);
    }
    public static com.fasterxml.jackson.databind.JsonNode parse(String json) {
        try { return Json.MAPPER.readTree(json); } catch(java.io.IOException e) { throw new IllegalStateException("Invalid archived JSON",e); }
    }
}
