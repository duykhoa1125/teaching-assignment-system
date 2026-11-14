package vn.edu.tass.backend.integration;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.edu.tass.backend.exception.PlanOperationException;
import vn.edu.tass.backend.payload.dto.PlanVersionDto;
import vn.edu.tass.backend.payload.request.CreatePlanRequest;
import vn.edu.tass.backend.payload.request.RefreshPlanSnapshotRequest;
import vn.edu.tass.backend.repository.SolverInputRepository;
import vn.edu.tass.backend.repository.WorkloadSourceRepository;
import vn.edu.tass.backend.service.AssignmentPlanService;
import vn.edu.tass.backend.solver.*;
import vn.edu.tass.solver.*;
import vn.edu.tass.testing.PlanApiTestConfiguration;

@EnabledIfSystemProperty(named="plan.integration",matches="true")
@SpringBootTest(classes=PlanApiTestConfiguration.class)
@AutoConfigureMockMvc
class SolverSnapshotPostgresTest {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) { AssignmentPlanPostgresTest.database(properties); }
    @Autowired JdbcTemplate jdbc;
    @Autowired AssignmentPlanService plans;
    @Autowired SolverInputPreparation preparation;
    @Autowired SolverSnapshotMapper mapper;
    @Autowired SolverInputRepository archive;
    @Autowired WorkloadSourceRepository sources;
    @Autowired AssignmentSolver solver;
    @Autowired InputValidator validator;
    @Autowired SolutionValidator solutionValidator;
    @Autowired PlatformTransactionManager transactions;
    RoundReadinessPostgresTest f;

    @BeforeEach
    void fixture() { f=new RoundReadinessPostgresTest(); f.jdbc=jdbc; f.fixture(); }
    private PlanVersionDto draft() { return plans.create(f.round,new CreatePlanRequest(1L,1L),f.principal); }
    private SolverInputPreparation.PreparedRun prepare(PlanVersionDto v) {
        return preparation.prepare(v.versionId(),v.revisionNo(),v.optimizationConfigId(),v.ruleSetVersionId(),f.principal);
    }
    private long runs() { return jdbc.queryForObject("SELECT count(*) FROM solver_run",Long.class); }
    private void lock(PlanVersionDto v) {
        new TransactionTemplate(transactions).executeWithoutResult(tx->jdbc.update("""
            UPDATE plan_demand SET teacher_id=?,unassigned_reason_code=NULL,unassigned_reason_text=NULL,
                is_locked=true,locked_by=?,locked_at=now(),lock_reason='Captured server-side test lock'
            WHERE plan_version_id=? AND demand_id=?
            """,f.teacher,f.actor,v.versionId(),f.demand));
    }

    @Test
    void databaseSourceMapsToV2AndSolvesWithIndependentValidation() {
        var v=draft(); var prepared=prepare(v); var input=prepared.input().snapshot();
        assertEquals("tass-solver/2",input.schemaVersion());
        assertEquals(Long.toString(f.school),input.identity().schoolId());
        assertEquals(Long.toString(f.semester),input.identity().semesterId());
        assertEquals(v.revisionNo(),input.identity().baseRevision());
        assertEquals(Long.toString(v.inputSnapshotId()),input.identity().snapshotId());
        assertEquals("1:1",input.identity().ruleSetVersion());
        assertEquals(50,input.config().totalSeconds()); // DB total 60 minus non-solver reserve 10.
        assertEquals(1,input.config().workers()); assertEquals(42,input.config().seed());
        assertEquals("10",input.scopes().get(0).gradeId()); // grade_code, not grade.id=1.
        assertEquals("PERIODS_PER_WEEK",input.normalization().unit());
        validator.validate(input);
        var result=solver.solve(input,new Cancellation());
        assertEquals("OPTIMAL",result.status(),result.errors().toString());
        assertEquals(List.of(0L,1500L,1500L,6L,1L),result.metrics().objectiveVector());
        Map<String,String> assignments=new LinkedHashMap<>();
        result.assignments().forEach(a->assignments.put(a.demandId(),a.teacherId()));
        var verified=solutionValidator.evaluate(input,assignments,result.coverageOptimalityProven());
        assertEquals(result.metrics(),verified.metrics()); assertEquals(result.loads(),verified.loads());
        assertEquals(v.revisionNo(),plans.current(f.round,f.principal).revisionNo());
        assertEquals("PREPARED",jdbc.queryForObject("SELECT status FROM solver_run WHERE id=?",String.class,prepared.runId()));
        assertEquals(f.actor,jdbc.queryForObject("SELECT requested_by FROM solver_run WHERE id=?",Long.class,prepared.runId()));
        assertEquals(0L,jdbc.queryForObject("SELECT count(*) FROM plan_demand WHERE plan_version_id=? AND teacher_id IS NOT NULL",Long.class,v.versionId()));
    }

    @Test
    void storesExactCanonicalTextAndReplaysIdenticalInput() {
        var prepared=prepare(draft());
        var row=archive.read(prepared.runId()).orElseThrow();
        assertEquals(prepared.input().canonicalJson(),row.canonical());
        assertEquals(Json.hash(prepared.input().snapshot()),row.hash());
        assertTrue(jdbc.queryForObject("SELECT solver_input_hash=encode(sha256(convert_to(solver_input_canonical,'UTF8')),'hex') AND solver_input_json=solver_input_canonical::jsonb FROM solver_run WHERE id=?",Boolean.class,prepared.runId()));
        assertEquals(prepared,preparation.replay(prepared.runId(),f.principal));
        assertEquals(prepared,preparation.requireFresh(prepared.runId(),f.principal));
    }

    @Test
    void sameIdentityProducesSameHashAcrossRunsAndEquivalentDecimalFormatting() throws Exception {
        var v=draft(); var first=prepare(v); var second=prepare(v);
        assertNotEquals(first.runId(),second.runId());
        assertEquals(first.input(),second.input());
        var raw=sources.read(v.inputSnapshotId()).orElseThrow();
        var root=(ObjectNode)Json.MAPPER.readTree(raw.payload());
        ((ObjectNode)root.path("demands").get(0)).put("periods_per_week",new BigDecimal("2.00"));
        var equivalent=new WorkloadSourceRepository.Captured(raw.id(),raw.roundId(),raw.configId(),raw.rulesId(),raw.token(),raw.contentHash(),Json.MAPPER.writeValueAsString(root));
        assertEquals(first.input(),mapper.map(equivalent,v,archive.assignments(v.versionId()),SolverSnapshotMapper.RuntimeOptions.defaults()));
    }

    @Test
    void takesCurrentAssignmentsAndLocksRatherThanTheOldSnapshotCopies() {
        var created=draft(); lock(created); var current=plans.current(f.round,f.principal);
        assertEquals(created.inputSnapshotId(),current.inputSnapshotId());
        var prepared=prepare(current); var input=prepared.input().snapshot();
        assertEquals(current.revisionNo(),input.identity().baseRevision());
        assertEquals(1,input.lockedAssignments().size());
        assertEquals(Long.toString(f.teacher),input.previousAssignments().get(0).teacherId());
        assertEquals(Long.toString(f.teacher),input.lockedAssignments().get(0).teacherId());
        assertEquals(0,input.teachers().get(0).workload().fixedOutside().signum());
        assertEquals(current.revisionNo(),plans.current(f.round,f.principal).revisionNo());
    }

    @Test
    void sourceChangeRejectsFreshnessButRetainsHistoricalReplay() {
        var prepared=prepare(draft());
        jdbc.update("UPDATE teacher SET full_name='Changed live name' WHERE id=?",f.teacher);
        var error=assertThrows(PlanOperationException.class,()->preparation.requireFresh(prepared.runId(),f.principal));
        assertEquals("STALE_INPUT",error.getCode());
        assertEquals(prepared,preparation.replay(prepared.runId(),f.principal));
        var current=plans.current(f.round,f.principal);
        assertEquals("STALE_INPUT",assertThrows(PlanOperationException.class,()->prepare(current)).getCode());
    }

    @Test
    void manualRevisionChangeInvalidatesOldInput() {
        var v=draft(); var prepared=prepare(v); lock(v);
        assertEquals("STALE_INPUT",assertThrows(PlanOperationException.class,()->preparation.requireFresh(prepared.runId(),f.principal)).getCode());
        long count=runs();
        assertEquals("REVISION_CONFLICT",assertThrows(PlanOperationException.class,()->prepare(v)).getCode());
        assertEquals(count,runs());
    }

    @Test
    void changingCurrentVersionInvalidatesOldInputWithoutDeletingHistory() {
        var v=draft(); var prepared=prepare(v);
        long next=jdbc.queryForObject("INSERT INTO plan_version(plan_id,version_no,source_version_id,status,input_snapshot_id,created_by) VALUES(?,2,?,'DRAFT',?,?) RETURNING id",Long.class,v.planId(),v.versionId(),v.inputSnapshotId(),f.actor);
        jdbc.update("UPDATE assignment_plan SET current_version_id=? WHERE id=?",next,v.planId());
        assertEquals("STALE_INPUT",assertThrows(PlanOperationException.class,()->preparation.requireFresh(prepared.runId(),f.principal)).getCode());
        assertEquals(prepared,preparation.replay(prepared.runId(),f.principal));
        assertEquals("CURRENT_DRAFT_REQUIRED",assertThrows(PlanOperationException.class,()->prepare(v)).getCode());
    }

    @Test
    void configChoiceMustMatchTheCapturedSnapshot() {
        var v=draft(); long count=runs();
        var error=assertThrows(PlanOperationException.class,()->preparation.prepare(v.versionId(),v.revisionNo(),Long.MAX_VALUE,1,f.principal));
        assertEquals("SNAPSHOT_REFRESH_REQUIRED",error.getCode());
        assertEquals(count,runs());
    }

    @Test
    void readinessIsRecheckedAndFailedPreparationDoesNotCreateRun() {
        var v=draft();
        jdbc.update("DELETE FROM required_demand_component WHERE applicability_id=?",f.applicability);
        var refreshed=plans.refresh(v.versionId(),new RefreshPlanSnapshotRequest(v.revisionNo(),1L,1L),f.principal);
        long count=runs();
        assertEquals("SOLVER_NOT_READY",assertThrows(PlanOperationException.class,()->prepare(refreshed)).getCode());
        assertEquals(count,runs());
        assertEquals(refreshed.revisionNo(),plans.current(f.round,f.principal).revisionNo());
    }

    @Test
    void inputValidatorRejectsLockedOverloadBeforeArchivingOrExecuting() {
        long config=jdbc.queryForObject("INSERT INTO optimization_config(config_code,version_no,criteria_weights_json,time_limit_seconds,confirmed_by,confirmed_at) SELECT ?,1,jsonb_set(criteria_weights_json,'{hard_limits,max_total_weekly}','1'),time_limit_seconds,?,now() FROM optimization_config WHERE id=1 RETURNING id",Long.class,"SNAP-"+f.round,f.actor);
        var v=plans.create(f.round,new CreatePlanRequest(config,1L),f.principal); lock(v);
        var current=plans.current(f.round,f.principal); long count=runs();
        assertEquals("LOCK_CONFLICT",assertThrows(WorkloadInputException.class,()->prepare(current)).code());
        assertEquals(count,runs());
        assertEquals(current.revisionNo(),plans.current(f.round,f.principal).revisionNo());
    }

    @Test
    void archiveHashIdentityAndHistoryAreProtectedByPostgres() {
        var prepared=prepare(draft()); long count=runs();
        assertThrows(DataIntegrityViolationException.class,()->jdbc.update("UPDATE solver_run SET solver_input_hash=? WHERE id=?","0".repeat(64),prepared.runId()));
        assertThrows(DataIntegrityViolationException.class,()->jdbc.update("UPDATE solver_run SET base_revision_no=base_revision_no+1 WHERE id=?",prepared.runId()));
        assertThrows(DataIntegrityViolationException.class,()->jdbc.update("DELETE FROM solver_run WHERE id=?",prepared.runId()));
        assertThrows(DataIntegrityViolationException.class,()->archive.insert(new SolverInputArchive(prepared.input().snapshot(),prepared.input().canonicalJson(),"0".repeat(64)),f.actor));
        assertEquals(count,runs());
        assertEquals(prepared,preparation.replay(prepared.runId(),f.principal));
        jdbc.update("UPDATE solver_run SET status='CANCELLED',finished_at=now() WHERE id=?",prepared.runId());
        assertEquals(prepared,preparation.replay(prepared.runId(),f.principal));
    }

    @Test
    void dbGuardRejectsLateInsertEvenIfJavaFreshnessWasBypassed() {
        var prepared=prepare(draft()); long count=runs();
        jdbc.update("UPDATE teacher SET full_name='Source changed after candidate' WHERE id=?",f.teacher);
        assertThrows(ConcurrencyFailureException.class,()->archive.insert(prepared.input(),f.actor));
        assertEquals(count,runs());
    }

    @Test
    void noQualifiedTeacherStillProducesAValidatedPartialDraftCandidate() {
        jdbc.update("UPDATE teaching_qualification SET verification_status='INACTIVE' WHERE teacher_id=?",f.teacher);
        var prepared=prepare(draft()); var result=solver.solve(prepared.input().snapshot(),new Cancellation());
        assertEquals("OPTIMAL",result.status(),result.errors().toString());
        assertEquals(1,result.metrics().unassignedComponents());
        assertTrue(result.coverageOptimalityProven());
        assertNull(result.assignments().get(0).teacherId());
    }

    @Test
    void finalGradeUsesGradeCodeAndStableOrderingAcrossMultipleScopes() throws Exception {
        jdbc.update("INSERT INTO manager_scope(user_id,grade_id,academic_year_id,valid_from,valid_to) VALUES(?,3,?,'2026-08-01','2027-07-31')",f.actor,f.year);
        long classroom=jdbc.queryForObject("INSERT INTO school_class(academic_year_id,grade_id,class_code,status) VALUES(?,3,'FINAL9','ACTIVE') RETURNING id",Long.class,f.year);
        long scope=jdbc.queryForObject("INSERT INTO round_subject_scope(round_id,grade_id,subject_id,confirmed_by,confirmed_at) VALUES(?,3,3,?,now()) RETURNING id",Long.class,f.round,f.actor);
        long app=jdbc.queryForObject("INSERT INTO class_subject_applicability(scope_id,class_id,status,updated_by,confirmed_by,confirmed_at) VALUES(?,?,'APPLICABLE',?,?,now()) RETURNING id",Long.class,scope,classroom,f.actor,f.actor);
        long demand=jdbc.queryForObject("INSERT INTO teaching_demand(semester_id,class_id,subject_id,periods_per_week,status,updated_by,demand_type,valid_from,valid_to,unit) VALUES(?,?,3,1,'ACTIVE',?,'STANDARD','2026-08-01','2026-12-31','PERIOD_PER_WEEK') RETURNING id",Long.class,f.semester,classroom,f.actor);
        jdbc.update("INSERT INTO required_demand_component(applicability_id,demand_type,valid_from,valid_to,demand_id,confirmed_by,confirmed_at) VALUES(?,'STANDARD','2026-08-01','2026-12-31',?,?,now())",app,demand,f.actor);
        jdbc.update("UPDATE class_subject_applicability SET components_confirmed_by=?,components_confirmed_at=now() WHERE id=?",f.actor,app);
        jdbc.update("INSERT INTO teaching_qualification(teacher_id,subject_id,education_level_id,verification_status,verified_by,verified_at,evidence_ref,valid_from,valid_to) VALUES(?,3,2,'VERIFIED',?,now(),'snap:final-grade-qualification','2026-08-01','2026-12-31')",f.teacher,f.actor);
        jdbc.update("INSERT INTO teaching_experience(teacher_id,subject_id,grade_id,recorded_by,experience_status,years_of_experience,as_of_date,evidence_ref,verified_by,verified_at) VALUES(?,3,3,?,'NO_EXPERIENCE',0,'2026-08-01','snap:final-grade-experience',?,now())",f.teacher,f.actor,f.actor);
        jdbc.update("UPDATE teacher_period_workload SET input_confirmation_json=jsonb_set(input_confirmation_json,'{in_scope_demand_ids}',jsonb_build_array(?::bigint,?::bigint)) WHERE teacher_id=?",f.demand,demand,f.teacher);
        var v=draft(); var prepared=prepare(v);
        assertEquals(3,prepared.input().snapshot().config().gradeWeight("9"));
        assertTrue(prepared.input().snapshot().scopes().stream().anyMatch(s->s.gradeId().equals("9")));
        var result=solver.solve(prepared.input().snapshot(),new Cancellation());
        assertEquals(24,result.metrics().experiencePenalty()); // 6*1 for grade 10 + 6*3 for grade 9.
        var raw=sources.read(v.inputSnapshotId()).orElseThrow(); var root=(ObjectNode)Json.MAPPER.readTree(raw.payload());
        for (String field:List.of("scope","applicability","required_components","demands","classes")) {
            List<JsonNode> reversed=new ArrayList<>(); root.path(field).forEach(reversed::add); Collections.reverse(reversed);
            var array=root.putArray(field); reversed.forEach(array::add);
        }
        var reordered=new WorkloadSourceRepository.Captured(raw.id(),raw.roundId(),raw.configId(),raw.rulesId(),raw.token(),raw.contentHash(),Json.MAPPER.writeValueAsString(root));
        List<SolverInputRepository.Assignment> reversed=new ArrayList<>(archive.assignments(v.versionId())); Collections.reverse(reversed);
        assertEquals(prepared.input(),mapper.map(reordered,v,reversed,SolverSnapshotMapper.RuntimeOptions.defaults()));
    }
}
