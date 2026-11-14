package vn.edu.tass.backend.integration;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.*;
import java.util.concurrent.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.tass.backend.payload.dto.*;
import vn.edu.tass.backend.payload.request.*;
import vn.edu.tass.backend.repository.*;
import vn.edu.tass.backend.service.AssignmentPlanService;
import vn.edu.tass.backend.solver.*;
import vn.edu.tass.solver.*;
import vn.edu.tass.testing.*;

@EnabledIfSystemProperty(named="plan.integration",matches="true")
@SpringBootTest(classes={PlanApiTestConfiguration.class,SolverExecutionTestConfiguration.class},properties="tass.solver.queue-capacity=1")
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SolverRunPostgresTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry p) { AssignmentPlanPostgresTest.database(p); }
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired AssignmentPlanService plans;
    @Autowired SolverRunCoordinator coordinator;
    @Autowired SolverRunRepository runs;
    @Autowired SolverInputPreparation preparation;
    @Autowired ControlledSolverEngine engine;
    @Autowired SolverResultApplier applier;
    @Autowired vn.edu.tass.backend.service.PlanResultService planResults;
    @Autowired AssignmentSolver solver;
    @Autowired SolverInputRepository inputs;
    @Autowired AssignmentPlanRepository planRepository;
    @Autowired vn.edu.tass.backend.service.PlanActorResolver actors;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;
    @Autowired javax.sql.DataSource dataSource;
    RoundReadinessPostgresTest f;
    @BeforeEach void fixture() { f=new RoundReadinessPostgresTest(); f.jdbc=jdbc; f.fixture(); }
    @AfterEach void releaseGates() throws Exception {
        engine.gates.values().forEach(g->g.release.countDown());
        long until=System.nanoTime()+TimeUnit.SECONDS.toNanos(10);
        while (jdbc.queryForObject("SELECT count(*) FROM solver_run WHERE queued_at IS NOT NULL AND status IN ('QUEUED','RUNNING','CANCEL_REQUESTED')",Long.class)>0 && System.nanoTime()<until) Thread.sleep(10);
    }
    PlanVersionDto draft() { return plans.create(f.round,new CreatePlanRequest(1L,1L),f.principal); }
    StartSolverRunRequest request(PlanVersionDto v) { return new StartSolverRunRequest(v.revisionNo(),1L,1L); }
    String body(PlanVersionDto v) { return "{\"expected_revision\":"+v.revisionNo()+",\"optimization_config_id\":1,\"rule_set_version_id\":1}"; }
    long postRun(PlanVersionDto v) throws Exception {
        var response=mvc.perform(post("/api/plan-versions/"+v.versionId()+"/solver-runs").principal(f.principal)
            .contentType(MediaType.APPLICATION_JSON).content(body(v))).andExpect(status().isAccepted()).andReturn().getResponse();
        long id=Json.MAPPER.readTree(response.getContentAsString()).path("id").asLong();
        assertEquals("/api/solver-runs/"+id,response.getHeader("Location")); return id;
    }
    SolverRunDto terminal(long id) throws Exception {
        long until=System.nanoTime()+TimeUnit.SECONDS.toNanos(10);
        do {
            var run=coordinator.get(id,f.principal);
            if (!Set.of("QUEUED","RUNNING","CANCEL_REQUESTED").contains(run.status())) return run;
            Thread.sleep(10);
        } while(System.nanoTime()<until);
        fail("Run did not finish: "+id); return null;
    }
    void entered(ControlledSolverEngine.Gate gate) throws Exception { assertTrue(gate.entered.await(5,TimeUnit.SECONDS)); }
    JsonNode readView(long version,String suffix) throws Exception {
        return Json.MAPPER.readTree(mvc.perform(get("/api/plan-versions/"+version+"/"+suffix).principal(f.principal)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }
    JsonNode validateView(PlanVersionDto v) throws Exception {
        var response=mvc.perform(post("/api/plan-versions/"+v.versionId()+"/validation").principal(f.principal).contentType(MediaType.APPLICATION_JSON)
            .content("{\"expected_revision\":"+v.revisionNo()+"}")).andExpect(status().isCreated()).andReturn().getResponse();
        var value=Json.MAPPER.readTree(response.getContentAsString());
        assertEquals("/api/plan-versions/"+v.versionId()+"/validation?validation_run_id="+value.path("id").asLong(),response.getHeader("Location")); return value;
    }
    long secondDemand() {
        return secondDemandUntil("2026-12-31");
    }
    long secondDemandUntil(String validTo) {
        long id=jdbc.queryForObject("""
            INSERT INTO teaching_demand(semester_id,class_id,subject_id,periods_per_week,status,updated_by,demand_type,valid_from,valid_to,unit)
            SELECT semester_id,class_id,subject_id,3,'ACTIVE',updated_by,'SPECIALIZED_TOPIC',valid_from,?::date,unit FROM teaching_demand WHERE id=? RETURNING id
            """,Long.class,validTo,f.demand);
        jdbc.update("INSERT INTO required_demand_component(applicability_id,demand_type,valid_from,valid_to,demand_id,confirmed_by,confirmed_at) VALUES(?,'SPECIALIZED_TOPIC','2026-08-01',?::date,?,?,now())",f.applicability,validTo,id,f.actor);
        jdbc.update("UPDATE class_subject_applicability SET components_confirmed_by=?,components_confirmed_at=now() WHERE id=?",f.actor,f.applicability);
        jdbc.update("UPDATE teacher_period_workload SET input_confirmation_json=jsonb_set(input_confirmation_json,'{in_scope_demand_ids}',jsonb_build_array(?::bigint,?::bigint)) WHERE teacher_id=?",f.demand,id,f.teacher);
        return id;
    }
    void lockFirst(PlanVersionDto v) {
        new org.springframework.transaction.support.TransactionTemplate(transactions).executeWithoutResult(tx->{
            planRepository.lockPlan(v.planId()); planRepository.lockVersion(v.versionId()); planRepository.lockRound(v.roundId()); planRepository.setActor(f.actor);
            jdbc.update("UPDATE plan_demand SET teacher_id=?,unassigned_reason_code=NULL,unassigned_reason_text=NULL,is_locked=true,locked_by=?,locked_at=now(),lock_reason='Keep this confirmed assignment' WHERE plan_version_id=? AND demand_id=?",f.teacher,f.actor,v.versionId(),f.demand);
        });
    }
    Contract.Result altered(Contract.Result result,java.util.function.Consumer<ObjectNode> change) {
        try { ObjectNode node=Json.MAPPER.valueToTree(result); change.accept(node); return Json.MAPPER.treeToValue(node,Contract.Result.class); }
        catch(java.io.IOException e) { throw new IllegalStateException(e); }
    }
    SolverRunDto storedTerminal(long id) throws Exception {
        long until=System.nanoTime()+TimeUnit.SECONDS.toNanos(10);
        do { var run=runs.read(id).orElseThrow(); if(!Set.of("QUEUED","RUNNING","CANCEL_REQUESTED").contains(run.status())) return run; Thread.sleep(10); }
        while(System.nanoTime()<until); fail("Run did not finish"); return null;
    }
    long assignmentAudits(PlanVersionDto v) {
        return jdbc.queryForObject("SELECT count(*) FROM audit_log WHERE entity_type='PLAN_DEMAND' AND entity_ref IN (SELECT id::text FROM plan_demand WHERE plan_version_id=?)",Long.class,v.versionId());
    }
    @Test void httpRunReturnsBeforeSolveAndAtomicallyAppliesValidatedCandidate() throws Exception {
        var v=draft(); var gate=engine.block(v.versionId(),false); long id=postRun(v); entered(gate);
        assertFalse(gate.inTransaction);
        mvc.perform(get("/api/solver-runs/"+id).principal(f.principal)).andExpect(status().isOk()).andExpect(jsonPath("status").value("RUNNING"));
        gate.release.countDown(); var run=terminal(id);
        assertEquals("SUCCEEDED",run.status()); assertEquals("OPTIMAL",run.summary().path("cp_sat_status").asText());
        assertEquals("APPLIED",run.summary().path("apply_outcome").asText());
        assertEquals(5,run.summary().path("stages").size());
        assertTrue(run.summary().path("stages").get(4).path("exactOptimalityProven").asBoolean());
        assertNotNull(run.executionStartedAt()); assertNotNull(run.finishedAt()); assertNotNull(run.preparationMs()); assertNotNull(run.solveMs());
        assertFalse(run.inputFresh()); // Applying changed rows advances revision beyond the captured input.
        var input=preparation.replay(id,f.principal).input().snapshot();
        var result=Json.MAPPER.readValue(jdbc.queryForObject("SELECT solver_result_json::text FROM solver_run WHERE id=?",String.class,id),Contract.Result.class);
        var assigned=new LinkedHashMap<String,String>(); result.assignments().forEach(a->assigned.put(a.demandId(),a.teacherId()));
        assertEquals(result.metrics(),new SolutionValidator().evaluate(input,assigned,result.coverageOptimalityProven()).metrics());
        assertEquals(v.revisionNo()+1,plans.current(f.round,f.principal).revisionNo());
        assertEquals(v.revisionNo()+1,run.appliedRevisionNo());
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM plan_demand WHERE plan_version_id=? AND teacher_id IS NOT NULL",Integer.class,v.versionId()));
    }
    @Test void duplicateActiveRunReturns409AndDoesNotCreateAnotherArchive() throws Exception {
        var v=draft(); var gate=engine.block(v.versionId(),false); long id=postRun(v); entered(gate);
        long before=jdbc.queryForObject("SELECT count(*) FROM solver_run",Long.class);
        mvc.perform(post("/api/plan-versions/"+v.versionId()+"/solver-runs").principal(f.principal).contentType(MediaType.APPLICATION_JSON).content(body(v)))
            .andExpect(status().isConflict()).andExpect(jsonPath("code").value("SOLVER_RUN_ACTIVE"))
            .andExpect(header().string("Location","/api/solver-runs/"+id));
        assertEquals(before,jdbc.queryForObject("SELECT count(*) FROM solver_run",Long.class));
        coordinator.cancel(id,f.principal); gate.release.countDown(); assertEquals("CANCELLED",terminal(id).status());
    }
    @Test void fullQueueRejectsAndQueuedCancellationFreesCapacity() throws Exception {
        var first=draft(); var gate=engine.block(first.versionId(),false); long one=postRun(first); entered(gate);
        // A second fixture in the same school/round is unnecessary: each round owns one plan.
        var original=f; f=new RoundReadinessPostgresTest(); f.jdbc=jdbc; f.fixture(); var second=draft(); long two=postRun(second);
        assertEquals("QUEUED",coordinator.get(two,f.principal).status());
        var secondActor=f; f=new RoundReadinessPostgresTest(); f.jdbc=jdbc; f.fixture(); var third=draft();
        mvc.perform(post("/api/plan-versions/"+third.versionId()+"/solver-runs").principal(f.principal).contentType(MediaType.APPLICATION_JSON).content(body(third)))
            .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("code").value("SOLVER_QUEUE_FULL"));
        assertEquals("CANCELLED",coordinator.cancel(two,secondActor.principal).status());
        assertNull(runs.read(two).orElseThrow().executionStartedAt());
        long three=postRun(third);
        coordinator.cancel(three,f.principal); coordinator.cancel(one,original.principal); gate.release.countDown();
    }
    @Test void runningCancellationIsPendingUntilWorkerStopsAndHasFiveNotRunStages() throws Exception {
        var v=draft(); var gate=engine.block(v.versionId(),false); long id=postRun(v); entered(gate);
        mvc.perform(post("/api/solver-runs/"+id+"/cancel").principal(f.principal)).andExpect(status().isOk()).andExpect(jsonPath("status").value("CANCEL_REQUESTED"));
        assertEquals("CANCEL_REQUESTED",coordinator.cancel(id,f.principal).status());
        gate.release.countDown(); var ended=terminal(id); assertEquals("CANCELLED",ended.status());
        assertEquals(5,ended.summary().path("stages").size());
        ended.summary().path("stages").forEach(s->assertEquals("NOT_RUN",s.path("status").asText()));
        assertNull(jdbc.queryForObject("SELECT solver_result_json::text FROM solver_run WHERE id=?",String.class,id));
    }
    @Test void lateCancellationDiscardsCandidateAtPersistenceBoundary() throws Exception {
        var v=draft(); var gate=engine.block(v.versionId(),true); long id=postRun(v); entered(gate);
        coordinator.cancel(id,f.principal); gate.release.countDown(); var ended=terminal(id);
        assertEquals("CANCELLED",ended.status()); assertEquals("CANCELLED",ended.summary().path("termination_reason").asText());
        assertEquals("OPTIMAL",ended.summary().path("cp_sat_status").asText());
        assertNull(jdbc.queryForObject("SELECT solver_result_json::text FROM solver_run WHERE id=?",String.class,id));
    }
    @Test void cancelTerminalIsIdempotentAndDoesNotUndoResult() throws Exception {
        var v=draft(); long id=postRun(v); var ended=terminal(id);
        assertEquals(ended,coordinator.cancel(id,f.principal));
        assertEquals(ended,coordinator.cancel(id,f.principal));
    }
    @Test void nativeFailureIsDurableAndNextRunCanProceed() throws Exception {
        var v=draft(); var gate=engine.block(v.versionId(),false); gate.fail=true; long id=postRun(v); entered(gate); gate.release.countDown();
        var ended=terminal(id); assertEquals("FAILED",ended.status()); assertEquals("EXECUTION_FAILED",ended.failureCode());
        assertEquals(5,ended.summary().path("stages").size());
        assertEquals("SUCCEEDED",terminal(postRun(v)).status());
    }
    @Test void sourceChangeDuringSolveMakesArchivedResultStaleWithoutApplyingIt() throws Exception {
        var v=draft(); var gate=engine.block(v.versionId(),false); long id=postRun(v); entered(gate);
        jdbc.update("UPDATE teaching_demand SET periods_per_week=3 WHERE id=?",f.demand);
        gate.release.countDown(); var ended=terminal(id);
        assertEquals("SUCCEEDED",ended.status()); assertFalse(ended.inputFresh());
        assertEquals(v.revisionNo(),plans.current(f.round,f.principal).revisionNo());
        assertEquals("STALE",ended.summary().path("apply_outcome").asText());
    }
    @Test void endpointsRequireTrustedActorAndScope() throws Exception {
        var v=draft(); long id=postRun(v); terminal(id);
        mvc.perform(get("/api/solver-runs/"+id)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/solver-runs/"+id+"/cancel")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/plan-versions/"+v.versionId()+"/solver-runs").contentType(MediaType.APPLICATION_JSON).content(body(v))).andExpect(status().isUnauthorized());
        var other=new RoundReadinessPostgresTest(); other.jdbc=jdbc; other.fixture();
        mvc.perform(get("/api/solver-runs/"+id).principal(other.principal)).andExpect(status().isForbidden());
        mvc.perform(post("/api/solver-runs/"+id+"/cancel").principal(other.principal)).andExpect(status().isForbidden());
        mvc.perform(post("/api/plan-versions/"+v.versionId()+"/solver-runs").principal(other.principal).contentType(MediaType.APPLICATION_JSON).content(body(v))).andExpect(status().isForbidden());
    }
    @Test void invalidRequestAndStaleRevisionDoNotQueueRuns() throws Exception {
        var v=draft();
        mvc.perform(post("/api/plan-versions/"+v.versionId()+"/solver-runs").principal(f.principal).contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/api/plan-versions/"+v.versionId()+"/solver-runs").principal(f.principal).contentType(MediaType.APPLICATION_JSON)
            .content(body(v).replace("\"expected_revision\":"+v.revisionNo(),"\"expected_revision\":"+(v.revisionNo()+1))))
            .andExpect(status().isConflict()).andExpect(jsonPath("code").value("REVISION_CONFLICT"));
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM solver_run WHERE plan_version_id=?",Integer.class,v.versionId()));
    }
    @Test void concurrentPostsAcceptOnlyOneRun() throws Exception {
        var v=draft(); var gate=engine.block(v.versionId(),false); var pool=Executors.newFixedThreadPool(2);
        try {
            var start=new CountDownLatch(1); var calls=new ArrayList<Future<String>>();
            for(int i=0;i<2;i++) calls.add(pool.submit(()->{ start.await(); try { coordinator.submit(v.versionId(),request(v),f.principal); return "ACCEPTED"; }
                catch(vn.edu.tass.backend.exception.PlanOperationException e) { return e.getCode(); } }));
            start.countDown(); var statuses=new ArrayList<String>(); for(var call:calls) statuses.add(call.get(5,TimeUnit.SECONDS));
            assertEquals(Set.of("ACCEPTED","SOLVER_RUN_ACTIVE"),new HashSet<>(statuses));
        } finally { gate.release.countDown(); pool.shutdownNow(); }
    }
    @Test void restartRecoveryFailsOnlyQueuedExecutionAndKeepsPreparedHistory() throws Exception {
        var v=draft(); var one=preparation.prepare(v.versionId(),v.revisionNo(),1,1,f.principal);
        var two=preparation.prepare(v.versionId(),v.revisionNo(),1,1,f.principal);
        runs.enqueue(one.runId(),7); runs.start(one.runId());
        assertEquals(1,runs.recover());
        assertEquals("FAILED",runs.read(one.runId()).orElseThrow().status());
        assertEquals("SERVICE_RESTARTED",runs.read(one.runId()).orElseThrow().failureCode());
        assertEquals("PREPARED",runs.read(two.runId()).orElseThrow().status());
        assertEquals(one.input(),preparation.replay(one.runId(),f.principal).input());
        assertEquals(0,runs.recover());
    }
    @Test void anotherDatabaseSessionCannotAcquireCoordinatorOwnership() {
        assertFalse(jdbc.queryForObject("SELECT pg_try_advisory_lock(836209340611)",Boolean.class));
    }
    @Test void containerReadinessRequiresInitializedNativeSolverAndDatabaseOwnership() throws Exception {
        mvc.perform(get("/internal/health")).andExpect(status().isOk()).andExpect(jsonPath("status").value("UP"));
    }
    @Test void applyingTwoRowsUsesActualTriggerRevisionAndTrustedAuditActor() throws Exception {
        secondDemand(); var v=draft(); long initial=assignmentAudits(v);
        var ids=jdbc.queryForList("SELECT id FROM plan_demand WHERE plan_version_id=? ORDER BY id",Long.class,v.versionId());
        var run=terminal(postRun(v)); assertEquals("APPLIED",run.summary().path("apply_outcome").asText());
        assertEquals(v.revisionNo()+2,run.appliedRevisionNo()); assertEquals(v.revisionNo()+2,plans.current(f.round,f.principal).revisionNo());
        assertEquals(ids,jdbc.queryForList("SELECT id FROM plan_demand WHERE plan_version_id=? ORDER BY id",Long.class,v.versionId()));
        assertEquals(initial+2,assignmentAudits(v));
        assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM audit_log WHERE actor_id=? AND action='ASSIGNMENT_UPDATE' AND entity_ref IN (SELECT id::text FROM plan_demand WHERE plan_version_id=?)",Integer.class,f.actor,v.versionId()));
        assertEquals(f.actor,jdbc.queryForObject("SELECT actor_id FROM audit_log WHERE action='SOLVER_APPLY' AND entity_ref=?",Long.class,Long.toString(run.id())));
        assertEquals("DRAFT",plans.current(f.round,f.principal).status());
    }
    @Test void lockedRowAndItsMetadataRemainExactlyUnchanged() throws Exception {
        secondDemand(); var created=draft(); lockFirst(created); var v=plans.current(f.round,f.principal);
        String before=jdbc.queryForObject("SELECT to_jsonb(pd)::text FROM plan_demand pd WHERE plan_version_id=? AND demand_id=?",String.class,v.versionId(),f.demand);
        var run=terminal(postRun(v)); assertEquals("APPLIED",run.summary().path("apply_outcome").asText());
        assertEquals(v.revisionNo()+1,run.appliedRevisionNo());
        assertEquals(before,jdbc.queryForObject("SELECT to_jsonb(pd)::text FROM plan_demand pd WHERE plan_version_id=? AND demand_id=?",String.class,v.versionId(),f.demand));
    }
    @Test void noOpApplyRetainsRevisionAndDoesNotCreateAssignmentAudit() throws Exception {
        secondDemand(); terminal(postRun(draft())); var v=plans.current(f.round,f.principal); long before=assignmentAudits(v);
        var run=terminal(postRun(v)); assertEquals("APPLIED",run.summary().path("apply_outcome").asText());
        assertEquals(v.revisionNo(),run.appliedRevisionNo()); assertEquals(v.revisionNo(),plans.current(f.round,f.principal).revisionNo());
        assertEquals(before,assignmentAudits(v)); assertTrue(run.inputFresh());
    }
    @Test void partialCandidatePersistsExplicitUnassignedReason() throws Exception {
        jdbc.update("UPDATE teaching_qualification SET verification_status='INACTIVE' WHERE teacher_id=?",f.teacher);
        var v=draft(); var run=terminal(postRun(v)); assertEquals("APPLIED",run.summary().path("apply_outcome").asText());
        assertEquals("NO_QUALIFIED_TEACHER",jdbc.queryForObject("SELECT unassigned_reason_code FROM plan_demand WHERE plan_version_id=?",String.class,v.versionId()));
        assertNull(jdbc.queryForObject("SELECT teacher_id FROM plan_demand WHERE plan_version_id=?",Long.class,v.versionId()));
    }
    @Test void manualEditAfterSolveMakesCandidateStaleAndPreservesUserChange() throws Exception {
        var v=draft(); var gate=engine.block(v.versionId(),true); long id=postRun(v); entered(gate);
        jdbc.update("UPDATE plan_demand SET unassigned_reason_code='MANUAL',unassigned_reason_text='Manager chose to leave unassigned' WHERE plan_version_id=?",v.versionId());
        gate.release.countDown(); var run=terminal(id); assertEquals("STALE",run.summary().path("apply_outcome").asText());
        assertNull(run.appliedRevisionNo()); assertEquals(v.revisionNo()+1,plans.current(f.round,f.principal).revisionNo());
        assertEquals("MANUAL",jdbc.queryForObject("SELECT unassigned_reason_code FROM plan_demand WHERE plan_version_id=?",String.class,v.versionId()));
    }
    @Test void refreshedSnapshotRejectsLateCandidate() throws Exception {
        var v=draft(); var gate=engine.block(v.versionId(),true); long id=postRun(v); entered(gate);
        var refreshed=plans.refresh(v.versionId(),new RefreshPlanSnapshotRequest(v.revisionNo(),1L,1L),f.principal);
        gate.release.countDown(); assertEquals("STALE",terminal(id).summary().path("apply_outcome").asText());
        assertEquals(refreshed.revisionNo(),plans.current(f.round,f.principal).revisionNo());
    }
    @Test void replacingCurrentVersionDoesNotWriteHistoricalAssignments() throws Exception {
        var v=draft(); var gate=engine.block(v.versionId(),true); long id=postRun(v); entered(gate);
        long next=jdbc.queryForObject("INSERT INTO plan_version(plan_id,version_no,source_version_id,status,input_snapshot_id,created_by) VALUES(?,2,?,'DRAFT',?,?) RETURNING id",Long.class,v.planId(),v.versionId(),v.inputSnapshotId(),f.actor);
        jdbc.update("UPDATE assignment_plan SET current_version_id=? WHERE id=?",next,v.planId());
        gate.release.countDown(); assertEquals("NOT_DRAFT",terminal(id).summary().path("apply_outcome").asText());
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM plan_demand WHERE plan_version_id=? AND teacher_id IS NOT NULL",Integer.class,v.versionId()));
    }
    @Test void permissionRevokedDuringSolvePreventsApplyingCandidate() throws Exception {
        var v=draft(); var gate=engine.block(v.versionId(),true); long id=postRun(v); entered(gate);
        jdbc.update("DELETE FROM manager_scope WHERE user_id=?",f.actor); gate.release.countDown();
        var run=storedTerminal(id); assertEquals("FAILED",run.status()); assertEquals("AUTHORIZATION_CHANGED",run.failureCode());
        assertEquals("REJECTED",run.summary().path("apply_outcome").asText()); assertNull(run.appliedRevisionNo());
        assertEquals(v.revisionNo(),jdbc.queryForObject("SELECT revision_no FROM plan_version WHERE id=?",Long.class,v.versionId()));
    }
    @Test void forgedCandidateHashIsRejectedBeforeAssignmentWrites() throws Exception {
        var v=draft(); var gate=engine.block(v.versionId(),true); gate.transform=r->altered(r,n->n.put("snapshotHash","0".repeat(64)));
        long id=postRun(v); entered(gate); gate.release.countDown(); var run=terminal(id);
        assertEquals("REJECTED",run.summary().path("apply_outcome").asText()); assertEquals("POST_VALIDATION_FAILED",run.failureCode());
        assertEquals(v.revisionNo(),plans.current(f.round,f.principal).revisionNo());
    }
    @Test void forgedResultObjectiveIsRejectedByIndependentValidator() throws Exception {
        var v=draft(); var gate=engine.block(v.versionId(),true);
        gate.transform=r->altered(r,n->((com.fasterxml.jackson.databind.node.ArrayNode)n.path("metrics").path("objectiveVector")).set(0,Json.MAPPER.getNodeFactory().numberNode(99)));
        long id=postRun(v); entered(gate); gate.release.countDown(); var run=terminal(id);
        assertEquals("REJECTED",run.summary().path("apply_outcome").asText()); assertNull(run.appliedRevisionNo());
    }
    @Test void invalidProofIsRejectedWithoutBreakingDurableFailureMetadata() throws Exception {
        var v=draft(); var gate=engine.block(v.versionId(),true);
        gate.transform=r->altered(r,n->((ObjectNode)n.path("phases").get(0)).put("bestBound",0.5));
        long id=postRun(v); entered(gate); gate.release.countDown(); var run=terminal(id);
        assertEquals("FAILED",run.status()); assertEquals("POST_VALIDATION_FAILED",run.failureCode());
        assertEquals("REJECTED",run.summary().path("post_validation_status").asText());
        assertFalse(run.summary().path("coverage").path("optimality_proven").asBoolean());
        run.summary().path("stages").forEach(s->assertFalse(s.path("exactOptimalityProven").asBoolean()));
        assertEquals(v.revisionNo(),plans.current(f.round,f.principal).revisionNo());
    }
    @Test void duplicateCandidateDemandsAreRejected() throws Exception {
        var v=draft(); var gate=engine.block(v.versionId(),true);
        gate.transform=r->altered(r,n->((com.fasterxml.jackson.databind.node.ArrayNode)n.path("assignments")).add(n.path("assignments").get(0).deepCopy()));
        long id=postRun(v); entered(gate); gate.release.countDown(); assertEquals("REJECTED",terminal(id).summary().path("apply_outcome").asText());
        assertEquals(v.revisionNo(),plans.current(f.round,f.principal).revisionNo());
    }
    @Test void unknownSolverResultDoesNotApplyEvenIfItContainsOldAssignments() throws Exception {
        var v=draft(); var gate=engine.block(v.versionId(),true); gate.transform=r->altered(r,n->n.put("status","UNKNOWN"));
        long id=postRun(v); entered(gate); gate.release.countDown(); var run=terminal(id);
        assertEquals("COMPLETED",run.status()); assertEquals("NO_CANDIDATE",run.summary().path("apply_outcome").asText());
        assertNull(run.appliedRevisionNo()); assertEquals(v.revisionNo(),plans.current(f.round,f.principal).revisionNo());
    }
    @Test void failedSecondAssignmentRollsBackAllRowsRevisionAndAudit() throws Exception {
        long second=secondDemand(); var v=draft(); long audit=assignmentAudits(v); var gate=engine.block(v.versionId(),true);
        String function="test_fail_apply_"+v.versionId();
        jdbc.execute("CREATE FUNCTION "+function+"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.plan_version_id="+v.versionId()+" AND NEW.demand_id="+second+" THEN RAISE EXCEPTION 'Controlled second row failure' USING ERRCODE='23514'; END IF; RETURN NEW; END $$");
        jdbc.execute("CREATE TRIGGER "+function+" BEFORE UPDATE ON plan_demand FOR EACH ROW EXECUTE FUNCTION "+function+"()");
        try {
            long id=postRun(v); entered(gate); gate.release.countDown(); var run=terminal(id);
            assertEquals("FAILED",run.status()); assertEquals("APPLY_FAILED",run.failureCode()); assertNull(run.appliedRevisionNo());
            assertEquals(v.revisionNo(),plans.current(f.round,f.principal).revisionNo()); assertEquals(audit,assignmentAudits(v));
            assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM plan_demand WHERE plan_version_id=? AND teacher_id IS NOT NULL",Integer.class,v.versionId()));
            assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM audit_log WHERE action='SOLVER_APPLY' AND entity_ref=?",Integer.class,Long.toString(id)));
        } finally { jdbc.execute("DROP TRIGGER "+function+" ON plan_demand"); jdbc.execute("DROP FUNCTION "+function+"()"); }
    }
    @Test void cancellationWinsWhileApplyTransactionIsWaitingForPlanLock() throws Exception {
        var v=draft(); var gate=engine.block(v.versionId(),true); long id=postRun(v); entered(gate);
        var pool=Executors.newSingleThreadExecutor();
        try(var connection=dataSource.getConnection()) {
            connection.setAutoCommit(false); long pid;
            try(var statement=connection.createStatement();var rs=statement.executeQuery("SELECT pg_backend_pid()")) { rs.next(); pid=rs.getLong(1); }
            try(var statement=connection.prepareStatement("SELECT id FROM assignment_plan WHERE id=? FOR UPDATE")) { statement.setLong(1,v.planId()); statement.executeQuery().close(); }
            gate.release.countDown(); long until=System.nanoTime()+TimeUnit.SECONDS.toNanos(5);
            while(!jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE ?::integer=ANY(pg_blocking_pids(pid)))",Boolean.class,pid) && System.nanoTime()<until) Thread.sleep(10);
            assertTrue(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE ?::integer=ANY(pg_blocking_pids(pid)))",Boolean.class,pid));
            var cancelled=pool.submit(()->coordinator.cancel(id,f.principal));
            while(!runs.read(id).orElseThrow().status().equals("CANCEL_REQUESTED") && System.nanoTime()<until) Thread.sleep(10);
            assertEquals("CANCEL_REQUESTED",runs.read(id).orElseThrow().status()); connection.commit();
            cancelled.get(5,TimeUnit.SECONDS); var run=terminal(id); assertEquals("CANCELLED",run.status()); assertNull(run.appliedRevisionNo());
            assertEquals(v.revisionNo(),plans.current(f.round,f.principal).revisionNo());
        } finally { pool.shutdownNow(); }
    }
    @Test void concurrentCompletionsApplyTheSameRunExactlyOnce() throws Exception {
        var v=draft(); var saved=preparation.prepare(v.versionId(),v.revisionNo(),1,1,f.principal); runs.enqueue(saved.runId(),0); runs.start(saved.runId());
        var result=solver.solve(saved.input().snapshot()); var pool=Executors.newFixedThreadPool(2); var start=new CountDownLatch(1);
        try {
            var first=pool.submit(()->{ start.await(); applier.complete(saved,result,new Cancellation(),1); return true; });
            var second=pool.submit(()->{ start.await(); applier.complete(saved,result,new Cancellation(),1); return true; });
            start.countDown(); first.get(5,TimeUnit.SECONDS); second.get(5,TimeUnit.SECONDS);
            assertEquals(v.revisionNo()+1,plans.current(f.round,f.principal).revisionNo());
            assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM audit_log WHERE action='SOLVER_APPLY' AND entity_ref=?",Integer.class,Long.toString(saved.runId())));
        } finally { pool.shutdownNow(); }
    }
    @Test @Order(Integer.MAX_VALUE)
    void newCoordinatorRecoversInterruptedRunsAndRejectsSecondOwner() throws Exception {
        var v=draft(); var saved=preparation.prepare(v.versionId(),v.revisionNo(),1,1,f.principal);
        runs.enqueue(saved.runId(),1); runs.start(saved.runId());
        coordinator.close(); // Simulate losing the old in-memory executor, keeping durable rows.
        mvc.perform(get("/internal/health")).andExpect(status().isServiceUnavailable()).andExpect(jsonPath("status").value("DOWN"));
        var restarted=new SolverRunCoordinator(preparation,inputs,runs,planRepository,actors,engine,applier,transactions,dataSource,1,1);
        var another=new SolverRunCoordinator(preparation,inputs,runs,planRepository,actors,engine,applier,transactions,dataSource,1,1);
        try {
            restarted.initialize(); restarted.initialize();
            assertEquals("FAILED",restarted.get(saved.runId(),f.principal).status());
            assertEquals("SERVICE_RESTARTED",restarted.get(saved.runId(),f.principal).failureCode());
            assertThrows(IllegalStateException.class,another::initialize);
            assertFalse(jdbc.queryForObject("SELECT pg_try_advisory_lock(836209340611)",Boolean.class));
            assertEquals("SUCCEEDED",terminal(restarted.submit(v.versionId(),request(v),f.principal).id()).status());
            var current=plans.current(f.round,f.principal); validateView(current);
            String checkpoint=System.getProperty("solver.e2e.artifact");
            if(checkpoint!=null) {
                var artifact=Json.MAPPER.createObjectNode().put("version_id",current.versionId()).put("login_name",f.principal.getName());
                for(String suffix:List.of("assignments","workloads","optimization","validation")) artifact.set(suffix,readView(current.versionId(),suffix));
                var path=java.nio.file.Path.of(checkpoint); java.nio.file.Files.createDirectories(path.toAbsolutePath().getParent());
                java.nio.file.Files.writeString(path,Json.MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(artifact),java.nio.charset.StandardCharsets.UTF_8);
            }
        } finally { another.close(); restarted.close(); }
    }
    @Test void fullHttpFlowMatchesUniformFixtureOracleAndFreshValidationReadiness() throws Exception {
        JsonNode oracle;
        try(var resource=getClass().getResourceAsStream("/solver-fixtures/db-uniform-expected.json")) { assertNotNull(resource); oracle=Json.MAPPER.readTree(resource).path("expected"); }
        mvc.perform(get("/api/assignment-rounds/"+f.round+"/readiness").param("optimization_config_id","1").param("rule_set_version_id","1").principal(f.principal))
            .andExpect(status().isOk()).andExpect(jsonPath("can_run_solver").value(true));
        var created=mvc.perform(post("/api/assignment-rounds/"+f.round+"/plan").principal(f.principal).contentType(MediaType.APPLICATION_JSON)
            .content("{\"optimization_config_id\":1,\"rule_set_version_id\":1}")).andExpect(status().isCreated()).andReturn();
        var v=plans.current(f.round,f.principal); long id=postRun(v); assertEquals("APPLIED",terminal(id).summary().path("apply_outcome").asText());
        var assignments=readView(v.versionId(),"assignments"); assertEquals(1,assignments.path("total").asInt());
        assertEquals(f.teacher,assignments.path("items").get(0).path("teacher_id").asLong());
        var load=readView(v.versionId(),"workloads").path("items").get(0);
        oracle.path("workload").fields().forEachRemaining(e->assertEquals(0,e.getValue().decimalValue().compareTo(load.path(e.getKey()).decimalValue()),e.getKey()));
        var optimization=readView(v.versionId(),"optimization"); assertTrue(optimization.path("matches_version").asBoolean());
        assertEquals(oracle.path("objective_vector"),optimization.path("objective_vector"));
        assertEquals(42,optimization.path("configuration").path("seed").asInt()); assertEquals(50,optimization.path("configuration").path("total_seconds").asInt());
        var current=plans.current(f.round,f.principal); var report=validateView(current);
        assertEquals(oracle.path("validation_status"),report.path("overall_status")); assertTrue(report.path("fresh").asBoolean());
        assertEquals(report,readView(v.versionId(),"validation"));
        assertEquals(current.revisionNo(),plans.current(f.round,f.principal).revisionNo());
        mvc.perform(get("/api/assignment-rounds/"+f.round+"/readiness").principal(f.principal)).andExpect(status().isOk())
            .andExpect(jsonPath("can_open_feedback").value(true)).andExpect(jsonPath("can_export").value(false));
    }
    @Test void assignmentFiltersHaveStablePaginationAndFilteredTotals() throws Exception {
        secondDemand(); var initial=draft(); lockFirst(initial); var v=plans.current(f.round,f.principal); terminal(postRun(v));
        long classroom=jdbc.queryForObject("SELECT class_id FROM teaching_demand WHERE id=?",Long.class,f.demand);
        var path="/api/plan-versions/"+v.versionId()+"/assignments";
        mvc.perform(get(path).principal(f.principal).param("teacher_id",Long.toString(f.teacher)).param("class_id",Long.toString(classroom)).param("limit","1").param("offset","1"))
            .andExpect(status().isOk()).andExpect(jsonPath("total").value(2)).andExpect(jsonPath("items.length()").value(1)).andExpect(jsonPath("items[0].demand_type").value("SPECIALIZED_TOPIC"));
        mvc.perform(get(path).principal(f.principal).param("is_locked","true").param("demand_type","STANDARD").param("valid_on","2026-08-01"))
            .andExpect(status().isOk()).andExpect(jsonPath("total").value(1)).andExpect(jsonPath("items[0].lock_reason").value("Keep this confirmed assignment"));
        mvc.perform(get(path).principal(f.principal).param("unassigned","true")).andExpect(status().isOk()).andExpect(jsonPath("total").value(0));
        mvc.perform(get(path).principal(f.principal).param("valid_on","2027-01-01")).andExpect(status().isOk()).andExpect(jsonPath("total").value(0));
    }
    @Test void snapshotLabelsAndWorkloadsDoNotMixChangedLiveTeacherData() throws Exception {
        var v=draft(); terminal(postRun(v)); var current=plans.current(f.round,f.principal); var report=validateView(current);
        jdbc.update("UPDATE teacher SET full_name='Changed live name' WHERE id=?",f.teacher);
        var assignments=readView(v.versionId(),"assignments"); assertFalse(assignments.path("version").path("snapshot_fresh").asBoolean());
        assertEquals("Readiness teacher",assignments.path("items").get(0).path("teacher_name").asText());
        var workloads=readView(v.versionId(),"workloads"); assertEquals("Readiness teacher",workloads.path("items").get(0).path("teacher_name").asText());
        assertFalse(readView(v.versionId(),"validation").path("fresh").asBoolean()); assertFalse(readView(v.versionId(),"optimization").path("matches_version").asBoolean());
        mvc.perform(post("/api/plan-versions/"+v.versionId()+"/validation").principal(f.principal).contentType(MediaType.APPLICATION_JSON).content("{\"expected_revision\":"+current.revisionNo()+"}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("code").value("STALE_INPUT"));
    }
    @Test void historicalVersionReadsStayAvailableWithOriginalValidation() throws Exception {
        var v=draft(); terminal(postRun(v)); var current=plans.current(f.round,f.principal); var report=validateView(current);
        long next=jdbc.queryForObject("INSERT INTO plan_version(plan_id,version_no,source_version_id,status,input_snapshot_id,created_by) VALUES(?,2,?,'DRAFT',?,?) RETURNING id",Long.class,v.planId(),v.versionId(),v.inputSnapshotId(),f.actor);
        jdbc.update("UPDATE assignment_plan SET current_version_id=? WHERE id=?",next,v.planId());
        assertEquals(1,readView(v.versionId(),"assignments").path("total").asInt());
        assertFalse(readView(v.versionId(),"workloads").path("version").path("current_version").asBoolean());
        var historical=readView(v.versionId(),"validation?validation_run_id="+report.path("id").asLong()); assertFalse(historical.path("fresh").asBoolean());
        assertEquals(report.path("workloads"),historical.path("workloads"));
        mvc.perform(post("/api/plan-versions/"+v.versionId()+"/validation").principal(f.principal).contentType(MediaType.APPLICATION_JSON).content("{\"expected_revision\":"+current.revisionNo()+"}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("code").value("CURRENT_VERSION_REQUIRED"));
    }
    @Test void validationOfPartialDraftReportsCoverageViolationWithoutEditingIt() throws Exception {
        var v=draft(); var report=validateView(v);
        assertEquals("VIOLATION",report.path("overall_status").asText()); assertTrue(report.path("fresh").asBoolean());
        assertEquals(0,report.path("workloads").get(0).path("a").asInt()); assertEquals(v.revisionNo(),plans.current(f.round,f.principal).revisionNo());
        assertEquals("NOT_ASSIGNED",readView(v.versionId(),"assignments").path("items").get(0).path("unassigned_reason_code").asText());
        mvc.perform(get("/api/assignment-rounds/"+f.round+"/readiness").principal(f.principal)).andExpect(status().isOk()).andExpect(jsonPath("can_open_feedback").value(false));
    }
    @Test void validationReportsWeeklyOverloadAndKeepsAnnualUnknownAsNull() throws Exception {
        jdbc.update("UPDATE teaching_demand SET periods_per_week=50 WHERE id=?",f.demand); var v=draft();
        jdbc.update("UPDATE plan_demand SET teacher_id=?,unassigned_reason_code=NULL,unassigned_reason_text=NULL WHERE plan_version_id=?",f.teacher,v.versionId());
        var current=plans.current(f.round,f.principal); var loads=readView(v.versionId(),"workloads"); assertEquals("VIOLATION",loads.path("overall_status").asText());
        assertEquals(50,loads.path("items").get(0).path("t").asInt()); assertEquals(33,loads.path("items").get(0).path("over").asInt());
        var report=validateView(current); assertEquals("VIOLATION",report.path("overall_status").asText()); boolean weekly=false,annual=false;
        for(var check:report.path("results")) {
            if(check.path("br_code").asText().equals("BR-06")) { weekly=true; assertEquals("VIOLATION",check.path("result_status").asText()); }
            if(check.path("calculation_period").asText().startsWith("ACADEMIC_YEAR:")) { annual=true; assertEquals("INSUFFICIENT_DATA",check.path("result_status").asText()); assertTrue(check.path("details").path("value").isNull()); }
        }
        assertTrue(weekly); assertTrue(annual);
    }
    @Test void notApplicableTargetKeepsNullDeviationAndMissingYearWarning() throws Exception {
        jdbc.update("UPDATE teacher_employment SET employment_status='ON_LEAVE' WHERE teacher_id=?",f.teacher); var v=draft();
        var load=readView(v.versionId(),"workloads").path("items").get(0);
        assertFalse(load.path("target_applicable").asBoolean()); assertTrue(load.path("delta_t").isNull()); assertTrue(load.path("under").isNull()); assertTrue(load.path("over").isNull());
    }
    @Test void missingSourceInventoryFailsWorkloadAndValidationWithoutFakeReport() throws Exception {
        jdbc.update("UPDATE teacher_period_workload SET input_confirmation_json=NULL,input_confirmed_by=NULL,input_confirmed_at=NULL WHERE teacher_id=?",f.teacher); var v=draft();
        mvc.perform(get("/api/plan-versions/"+v.versionId()+"/workloads").principal(f.principal)).andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/plan-versions/"+v.versionId()+"/validation").principal(f.principal).contentType(MediaType.APPLICATION_JSON).content("{\"expected_revision\":"+v.revisionNo()+"}"))
            .andExpect(status().isUnprocessableEntity());
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM validation_run WHERE plan_version_id=?",Integer.class,v.versionId()));
        assertEquals(1,readView(v.versionId(),"assignments").path("total").asInt());
    }
    @Test void resultEndpointsRejectInvalidFiltersAndUntrustedOrWrongScopeActors() throws Exception {
        var v=draft(); var other=new RoundReadinessPostgresTest(); other.jdbc=jdbc; other.fixture();
        for(String suffix:List.of("assignments","workloads","optimization","validation")) {
            mvc.perform(get("/api/plan-versions/"+v.versionId()+"/"+suffix)).andExpect(status().isUnauthorized());
            mvc.perform(get("/api/plan-versions/"+v.versionId()+"/"+suffix).principal(other.principal)).andExpect(status().isForbidden());
        }
        for(String param:List.of("limit=0","offset=-1","teacher_id=0","demand_type=UNKNOWN","valid_on=bad")) {
            mvc.perform(get("/api/plan-versions/"+v.versionId()+"/assignments?"+param).principal(f.principal)).andExpect(status().isBadRequest());
        }
        mvc.perform(post("/api/plan-versions/"+v.versionId()+"/validation").contentType(MediaType.APPLICATION_JSON).content("{\"expected_revision\":1}")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/plan-versions/"+v.versionId()+"/validation").principal(f.principal).contentType(MediaType.APPLICATION_JSON).content("{\"expected_revision\":1,\"checked_by\":1}"))
            .andExpect(status().isBadRequest());
    }
    @Test void resultReadsDoNotExposeCanonicalInputOrTeacherProfiles() throws Exception {
        var v=draft(); terminal(postRun(v)); validateView(plans.current(f.round,f.principal));
        for(String suffix:List.of("assignments","workloads","optimization","validation")) {
            String body=readView(v.versionId(),suffix).toString(); assertFalse(body.contains("credential_hash")); assertFalse(body.contains("solver_input_canonical"));
            assertFalse(body.contains("qualifications")); assertFalse(body.contains("experiencePenalties"));
        }
    }
    @Test void failedOrCancelledAttemptDoesNotReplaceLastAppliedOptimizationProof() throws Exception {
        var v=draft(); long first=postRun(v); terminal(first); var current=plans.current(f.round,f.principal);
        var gate=engine.block(v.versionId(),false); long second=postRun(current); entered(gate); coordinator.cancel(second,f.principal); gate.release.countDown(); terminal(second);
        var view=readView(v.versionId(),"optimization"); assertEquals(first,view.path("run").path("id").asLong()); assertEquals(second,view.path("latest_run_id").asLong()); assertTrue(view.path("matches_version").asBoolean());
    }
    @Test void validationHistoryRemainsReadableAndBecomesStaleAfterManualEdit() throws Exception {
        var v=draft(); terminal(postRun(v)); var report=validateView(plans.current(f.round,f.principal));
        jdbc.update("UPDATE plan_demand SET teacher_id=NULL,unassigned_reason_code='MANUAL',unassigned_reason_text='Manager edited' WHERE plan_version_id=?",v.versionId());
        var old=readView(v.versionId(),"validation?validation_run_id="+report.path("id").asLong()); assertFalse(old.path("fresh").asBoolean()); assertEquals(report.path("workloads"),old.path("workloads"));
        var latest=validateView(plans.current(f.round,f.principal)); assertEquals("VIOLATION",latest.path("overall_status").asText()); assertEquals(latest,readView(v.versionId(),"validation"));
    }
    @Test void validationRowFailureRollsBackHeaderAndEveryResult() throws Exception {
        var v=draft(); String name="test_validation_fail_"+v.versionId();
        jdbc.execute("CREATE FUNCTION "+name+"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.subject_ref='"+f.teacher+"' AND NEW.br_code='BR-09' THEN RAISE EXCEPTION 'Controlled validation failure' USING ERRCODE='23514'; END IF; RETURN NEW; END $$");
        jdbc.execute("CREATE TRIGGER "+name+" BEFORE INSERT ON validation_result FOR EACH ROW EXECUTE FUNCTION "+name+"()");
        try {
            mvc.perform(post("/api/plan-versions/"+v.versionId()+"/validation").principal(f.principal).contentType(MediaType.APPLICATION_JSON).content("{\"expected_revision\":"+v.revisionNo()+"}"))
                .andExpect(status().isUnprocessableEntity());
            assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM validation_run WHERE plan_version_id=?",Integer.class,v.versionId()));
            assertEquals(v.revisionNo(),plans.current(f.round,f.principal).revisionNo());
        } finally { jdbc.execute("DROP TRIGGER "+name+" ON validation_result"); jdbc.execute("DROP FUNCTION "+name+"()"); }
    }
    @Test void postgresRejectsTamperingAndAppendingToASealedValidationReport() throws Exception {
        var v=draft(); long run=validateView(v).path("id").asLong();
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update("UPDATE validation_run SET summary_json='{}' WHERE id=?",run));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update("DELETE FROM validation_result WHERE validation_run_id=?",run));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update("INSERT INTO validation_result(validation_run_id,br_code,subject_type,subject_ref,calculation_period,result_status,severity,message) VALUES(?,'FAKE','PLAN','x','SEMESTER:x','PASS','INFO','Late append')",run));
        assertEquals(run,readView(v.versionId(),"validation").path("id").asLong());
    }
    @Test void staleRevisionAndCrossVersionReportIdsAreRejected() throws Exception {
        var v=draft(); var report=validateView(v);
        mvc.perform(post("/api/plan-versions/"+v.versionId()+"/validation").principal(f.principal).contentType(MediaType.APPLICATION_JSON).content("{\"expected_revision\":"+(v.revisionNo()+1)+"}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("code").value("REVISION_CONFLICT"));
        var original=f; f=new RoundReadinessPostgresTest(); f.jdbc=jdbc; f.fixture(); var other=draft();
        mvc.perform(get("/api/plan-versions/"+other.versionId()+"/validation").param("validation_run_id",report.path("id").asText()).principal(f.principal)).andExpect(status().isNotFound());
        f=original;
    }
    @Test void unsupportedMultipleIntervalsAreReportedWithoutExtendingSolverScope() throws Exception {
        secondDemandUntil("2026-11-30");
        var v=draft(); mvc.perform(get("/api/plan-versions/"+v.versionId()+"/workloads").principal(f.principal)).andExpect(status().isUnprocessableEntity());
        assertEquals(2,readView(v.versionId(),"assignments").path("total").asInt());
    }
}
