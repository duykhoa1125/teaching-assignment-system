package vn.edu.tass.backend.solver;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.stereotype.Component;
import vn.edu.tass.backend.payload.dto.PlanVersionDto;
import vn.edu.tass.backend.repository.SolverInputRepository.Assignment;
import vn.edu.tass.backend.repository.WorkloadSourceRepository.Captured;
import vn.edu.tass.solver.AssignmentSolver;
import vn.edu.tass.solver.Contract;
import vn.edu.tass.solver.InputValidator;
import vn.edu.tass.solver.Json;
import static vn.edu.tass.backend.solver.CapturedWorkloadData.*;
import static vn.edu.tass.backend.solver.WorkloadInputException.require;

/** DB snapshot shape and solver DTO shape are mapped explicitly; no browser prechecks are accepted. */
@Component
public class SolverSnapshotMapper {
    /** Server execution choices, distinct from business-policy data; persisted in the canonical input. */
    public record RuntimeOptions(int workers,int seed) {
        public static RuntimeOptions defaults() { return new RuntimeOptions(1,42); }
    }
    private final DbWorkloadPreparer workloads;
    private final InputValidator validator;

    public SolverSnapshotMapper(DbWorkloadPreparer workloads,InputValidator validator) {
        this.workloads=workloads;
        this.validator=validator;
    }

    public SolverInputArchive map(Captured captured,PlanVersionDto version,List<Assignment> assignments,RuntimeOptions runtime) {
        require(version.inputSnapshotId()==captured.id() && version.roundId()==captured.roundId()
            && version.optimizationConfigId()==captured.configId() && version.ruleSetVersionId()==captured.rulesId(),
            "SNAPSHOT_IDENTITY_MISMATCH","input_snapshot#"+captured.id(),"Version and captured source identities differ");
        JsonNode root;
        try { root=Json.MAPPER.reader().with(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS).readTree(captured.payload()); }
        catch (java.io.IOException e) { throw new WorkloadInputException("INVALID_DB_SNAPSHOT","input_snapshot#"+captured.id(),"Invalid source JSON"); }
        var prepared=workloads.prepare(captured.id());
        var rawDemands=index(root,"demands");
        var classes=index(root,"classes"); var grades=index(root,"grades"); var subjects=index(root,"subjects");
        long semester=id(root.path("semester"),"id"),year=id(root.path("academic_year"),"id");
        var rawScopes=index(root,"scope");
        var applications=index(root,"applicability");
        var components=index(root,"required_components");
        List<Contract.Scope> scopes=new ArrayList<>();
        Set<Long> acceptedDemands=new HashSet<>(),acceptedApplications=new HashSet<>();
        confirmed(root.path("round"),"scope_confirmed_by","scope_confirmed_at");
        for (var scope:rawScopes.values()) {
            require(id(scope,"round_id")==captured.roundId(),"SCOPE_CONTEXT_MISMATCH",ref("round_subject_scope",scope),"Scope belongs to another round");
            confirmed(scope,"confirmed_by","confirmed_at");
            long subject=id(scope,"subject_id"),grade=id(scope,"grade_id");
            var gradeRow=required(grades,grade,"grades");
            var subjectRow=required(subjects,subject,"subjects");
            for (var classroom:classes.values()) {
                if (id(classroom,"academic_year_id")!=year || id(classroom,"grade_id")!=grade) continue;
                var apps=applications.values().stream().filter(a->id(a,"scope_id")==id(scope,"id") && id(a,"class_id")==id(classroom,"id")).toList();
                require(apps.size()==1,"MISSING_APPLICABILITY",ref("school_class",classroom),"Exactly one confirmed class-subject applicability required");
                var app=apps.get(0); acceptedApplications.add(id(app,"id"));
                confirmed(app,"confirmed_by","confirmed_at");
                Contract.Applicability status;
                try { status=Contract.Applicability.valueOf(text(app,"status")); }
                catch (IllegalArgumentException e) { throw new WorkloadInputException("INVALID_APPLICABILITY",ref("class_subject_applicability",app),"Unknown applicability status"); }
                require(status!=Contract.Applicability.UNDETERMINED,"UNDETERMINED",ref("class_subject_applicability",app),"Unresolved applicability");
                Set<Contract.DemandType> requiredTypes=EnumSet.noneOf(Contract.DemandType.class);
                if (status==Contract.Applicability.APPLICABLE) {
                    confirmed(app,"components_confirmed_by","components_confirmed_at");
                    for (var component:components.values()) {
                        if (id(component,"applicability_id")!=id(app,"id")) continue;
                        confirmed(component,"confirmed_by","confirmed_at");
                        var demand=required(rawDemands,id(component,"demand_id"),"demands");
                        Contract.DemandType type=demandType(component);
                        require(requiredTypes.add(type),"DUPLICATE_REQUIRED_COMPONENT",ref("required_demand_component",component),"Repeated component type requires unsupported segmentation");
                        require(id(demand,"class_id")==id(classroom,"id") && id(demand,"subject_id")==subject
                            && id(demand,"semester_id")==semester && type==demandType(demand)
                            && date(component,"valid_from").equals(date(demand,"valid_from"))
                            && date(component,"valid_to").equals(date(demand,"valid_to")),
                            "REQUIRED_DEMAND_CONTEXT_MISMATCH",ref("required_demand_component",component),"Required component does not match captured demand");
                        require(acceptedDemands.add(id(demand,"id")),"DUPLICATE_REQUIRED_DEMAND",ref("teaching_demand",demand),"Demand appears in more than one required component");
                    }
                    require(!requiredTypes.isEmpty(),"EMPTY_REQUIRED_SET",ref("class_subject_applicability",app),"Applicable scope needs confirmed components");
                }
                scopes.add(new Contract.Scope(Long.toString(id(classroom,"id")),text(classroom,"class_code"),Long.toString(subject),
                    text(subjectRow,"name"),text(gradeRow,"grade_code"),Long.toString(id(gradeRow,"education_level_id")),status,
                    List.copyOf(requiredTypes),ref("round_subject_scope",scope)+"; "+ref("class_subject_applicability",app)));
            }
        }
        require(acceptedApplications.equals(applications.keySet()),"APPLICABILITY_CONTEXT_MISMATCH","applicability","Unexpected class/scope context in captured applicability");
        require(acceptedDemands.equals(rawDemands.keySet()),"ACTIVE_DEMAND_NOT_IN_REQUIRED_SET","demands","Do not silently discard an active demand or required component");
        scopes.sort(Comparator.comparing(Contract.Scope::classId).thenComparing(Contract.Scope::subjectId));
        List<Contract.Demand> demands=new ArrayList<>();
        for (var d:rawDemands.values()) demands.add(new Contract.Demand(Long.toString(id(d,"id")),Long.toString(id(d,"class_id")),
            Long.toString(id(d,"subject_id")),Long.toString(semester),demandType(d),decimal(number(d,"periods_per_week")),
            ref("teaching_demand",d),date(d,"valid_from"),date(d,"valid_to")));
        List<Contract.Teacher> teachers=new ArrayList<>();
        for (var t:prepared.teachers().values()) {
            var w=t.workload();
            var workload=new Contract.Workload(decimal(w.base()),decimal(w.reduction()),decimal(w.fixedOutside()),decimal(w.converted()),
                w.targetApplicable(),w.source(),w.selectedBaseline(),w.outsideDemandIds().stream().sorted().toList());
            List<Contract.HardCheck> checks=new ArrayList<>();
            for (var check:t.hardChecks()) {
                Map<String,BigDecimal> coefficients=new TreeMap<>(); check.coefficients().forEach((k,v)->coefficients.put(k,decimal(v)));
                checks.add(new Contract.HardCheck(check.id(),check.ruleId(),check.period(),check.calculationPeriod(),check.unit(),check.dataStatus(),
                    decimal(check.fixed()),decimal(check.converted()),coefficients,decimal(check.limit()),check.missingData().stream().sorted().toList(),check.source()));
            }
            checks.sort(Comparator.comparing(Contract.HardCheck::id));
            var qualifications=t.qualifications().stream().sorted(Comparator.comparing(Contract.Qualification::subjectId).thenComparing(Contract.Qualification::levelId).thenComparing(Contract.Qualification::source)).toList();
            teachers.add(new Contract.Teacher(Long.toString(t.id()),t.name(),t.employments(),qualifications,workload,t.experiencePenalties(),checks));
        }
        var config=root.path("optimization_config"); var rules=root.path("rule_set");
        var identity=new Contract.Identity(Long.toString(id(root.path("school"),"id")),Long.toString(semester),Long.toString(captured.roundId()),
            Long.toString(version.planId()),Long.toString(version.versionId()),version.revisionNo(),Long.toString(captured.id()),captured.token(),
            captured.rulesId()+":"+id(rules,"version_no"),captured.configId()+":"+id(config,"version_no"));
        List<Contract.PreviousAssignment> previous=new ArrayList<>(); List<Contract.LockedAssignment> locks=new ArrayList<>();
        Set<Long> seen=new HashSet<>();
        for (var assignment:assignments.stream().sorted(Comparator.comparingLong(Assignment::demandId)).toList()) {
            require(seen.add(assignment.demandId()),"DUPLICATE_PREVIOUS_ASSIGNMENT","plan_demand","Repeated demand in previous assignments");
            previous.add(new Contract.PreviousAssignment(Long.toString(assignment.demandId()),assignment.teacherId()==null?null:Long.toString(assignment.teacherId())));
            if (assignment.locked()) {
                require(assignment.teacherId()!=null && assignment.lockedBy()!=null && assignment.lockedAt()!=null
                    && assignment.lockReason()!=null && !assignment.lockReason().isBlank(),"LOCK_CONFLICT","plan_demand","Incomplete lock metadata");
                locks.add(new Contract.LockedAssignment(Long.toString(assignment.demandId()),Long.toString(assignment.teacherId()),
                    Long.toString(assignment.lockedBy()),assignment.lockedAt().toString(),assignment.lockReason()));
            }
        }
        var snapshot=new Contract.Snapshot("tass-solver/2",identity,prepared.period(),
            new Contract.Normalization(prepared.integerScale(),"PERIODS_PER_WEEK",Contract.LoadBasis.FIXED_WEEKLY,"EXACT"),
            config(config,runtime),scopes,demands,teachers,previous,"plan-version:"+version.versionId()+":revision:"+version.revisionNo(),
            prepared.prechecks().stream().sorted(Comparator.comparing(Contract.Precheck::ruleId)).toList(),
            "DB input_snapshot#"+captured.id()+"; workload-normalizer/1; rule-set "+identity.ruleSetVersion(),locks);
        try { validator.validate(snapshot); }
        catch (InputValidator.InvalidInput e) {
            String code=e.issues().stream().anyMatch(i->"LOCK_CONFLICT".equals(i.code()))?"LOCK_CONFLICT":"INVALID_SOLVER_INPUT";
            throw new WorkloadInputException(code,"input_snapshot#"+captured.id(),e.getMessage());
        }
        return SolverInputArchive.create(snapshot);
    }

    private static Contract.Config config(JsonNode row,RuntimeOptions options) {
        var cfg=row.path("criteria_weights_json");
        require("COMPONENTS".equals(text(cfg,"coverage_mode")) && "T-B".equals(text(cfg,"load_basis"))
            && "KEEP_LOCKED".equals(text(cfg,"lock_policy")) && "DRAFT_ONLY".equals(text(cfg,"unassigned_policy")),
            "UNSUPPORTED_SOLVER_CONFIG","optimization_config","Unsupported business policy");
        var order=rows(cfg,"objective_order").stream().map(JsonNode::asText).toList();
        require(order.equals(AssignmentSolver.STAGES),"UNSUPPORTED_OBJECTIVE_ORDER","optimization_config","Exactly five ordered lexicographic stages required");
        Map<String,Double> budgets=new TreeMap<>();
        for (var stage:rows(cfg,"stage_budgets")) {
            require(budgets.put(text(stage,"name"),number(stage,"seconds").doubleValue())==null,"DUPLICATE_STAGE_BUDGET","stage_budgets","Repeated stage");
        }
        require(budgets.keySet().equals(new HashSet<>(AssignmentSolver.STAGES)),"INVALID_STAGE_BUDGET","stage_budgets","Missing or extra stage budget");
        Map<String,Long> weights=new TreeMap<>();
        var rawWeights=cfg.path("experience").path("grade_weights");
        require(rawWeights.isObject(),"INVALID_GRADE_WEIGHTS","grade_weights","Weight object required");
        rawWeights.fieldNames().forEachRemaining(k->{
            try { weights.put(k,number(rawWeights,k).longValueExact()); }
            catch (ArithmeticException e) { throw new WorkloadInputException("INVALID_GRADE_WEIGHTS",k,"Exact integer grade weight required"); }
        });
        BigDecimal total=number(row,"time_limit_seconds").subtract(number(cfg,"non_solver_budget_seconds"));
        require(total.signum()>0,"INVALID_SOLVER_BUDGET","optimization_config","Non-solver reserve exhausts total budget");
        return new Contract.Config(Contract.CoverageMode.COMPONENTS,Contract.DeviationBasis.T,Contract.PreservePolicy.PENALIZE_CHANGES,
            1,1,1,total.doubleValue(),budgets.get("Z"),budgets.entrySet().stream().filter(e->!e.getKey().equals("Z")).mapToDouble(Map.Entry::getValue).sum(),
            options.workers(),options.seed(),ref("optimization_config",row)+" version="+id(row,"version_no")+"; configured total minus non-solver reserve",
            cfg.path("demo_only").asBoolean(false),budgets,weights);
    }
    private static void confirmed(JsonNode row,String actor,String at) { id(row,actor); OffsetDateTime.parse(text(row,at)); }
    private static Contract.DemandType demandType(JsonNode row) {
        try { return Contract.DemandType.valueOf(text(row,"demand_type")); }
        catch (IllegalArgumentException e) { throw new WorkloadInputException("INVALID_DEMAND_TYPE","demand_type","Unknown demand component type"); }
    }
    private static JsonNode required(Map<Long,JsonNode> rows,long id,String source) {
        var value=rows.get(id); require(value!=null,"MISSING_SOURCE_REFERENCE",source,"Referenced row not captured: "+id); return value;
    }
    private static BigDecimal decimal(BigDecimal value) {
        return value==null?null:value.signum()==0?BigDecimal.ZERO:value.stripTrailingZeros();
    }
}
