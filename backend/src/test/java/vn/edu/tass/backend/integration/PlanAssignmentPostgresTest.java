package vn.edu.tass.backend.integration;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.*;
import java.util.concurrent.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import vn.edu.tass.backend.payload.dto.*;
import vn.edu.tass.backend.payload.request.*;
import vn.edu.tass.backend.repository.*;
import vn.edu.tass.backend.service.*;
import vn.edu.tass.backend.solver.*;
import vn.edu.tass.solver.Json;
import vn.edu.tass.testing.*;

@EnabledIfSystemProperty(named="plan.integration",matches="true")
@SpringBootTest(classes={PlanApiTestConfiguration.class,SolverExecutionTestConfiguration.class},properties="tass.solver.queue-capacity=1")
@AutoConfigureMockMvc
@DirtiesContext(classMode=DirtiesContext.ClassMode.AFTER_CLASS)
class PlanAssignmentPostgresTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry p) { AssignmentPlanPostgresTest.database(p); }
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired AssignmentPlanService plans;
    @Autowired PlanAssignmentService assignments;
    @Autowired PlanResultService results;
    @Autowired SolverRunCoordinator coordinator;
    @Autowired ControlledSolverEngine engine;
    RoundReadinessPostgresTest f;
    long extra,otherTeacher;
    @BeforeEach void fixture() {
        f=new RoundReadinessPostgresTest(); f.jdbc=jdbc; f.fixture();
        jdbc.update("UPDATE teaching_demand SET periods_per_week=3 WHERE id=?",f.demand);
        extra=jdbc.queryForObject("""
            INSERT INTO teaching_demand(semester_id,class_id,subject_id,periods_per_week,status,updated_by,demand_type,valid_from,valid_to,unit)
            SELECT semester_id,class_id,subject_id,2,'ACTIVE',updated_by,'ENRICHMENT',valid_from,valid_to,unit FROM teaching_demand WHERE id=? RETURNING id
            """,Long.class,f.demand);
        jdbc.update("INSERT INTO required_demand_component(applicability_id,demand_type,valid_from,valid_to,demand_id,confirmed_by,confirmed_at) VALUES(?,'ENRICHMENT','2026-08-01','2026-12-31',?,?,now())",f.applicability,extra,f.actor);
        jdbc.update("UPDATE class_subject_applicability SET components_confirmed_by=?,components_confirmed_at=now() WHERE id=?",f.actor,f.applicability);
        jdbc.update("UPDATE teacher_period_workload SET input_confirmation_json=jsonb_set(input_confirmation_json,'{in_scope_demand_ids}',jsonb_build_array(?::bigint,?::bigint)) WHERE teacher_id=?",f.demand,extra,f.teacher);
        otherTeacher=jdbc.queryForObject("INSERT INTO teacher(school_id,teacher_code,full_name) VALUES(?,'OTHER','Other component teacher') RETURNING id",Long.class,f.school);
        jdbc.update("INSERT INTO teacher_employment(teacher_id,department_id,semester_id,employment_status,position_code,valid_from,valid_to) SELECT ?,department_id,semester_id,employment_status,position_code,valid_from,valid_to FROM teacher_employment WHERE teacher_id=?",otherTeacher,f.teacher);
        jdbc.update("INSERT INTO teaching_qualification(teacher_id,subject_id,education_level_id,verification_status,verified_by,verified_at,evidence_ref,valid_from,valid_to) SELECT ?,subject_id,education_level_id,verification_status,verified_by,verified_at,evidence_ref,valid_from,valid_to FROM teaching_qualification WHERE teacher_id=?",otherTeacher,f.teacher);
        jdbc.update("INSERT INTO teaching_experience(teacher_id,subject_id,grade_id,recorded_by,experience_status,years_of_experience,as_of_date,evidence_ref,verified_by,verified_at) SELECT ?,subject_id,grade_id,recorded_by,experience_status,years_of_experience,as_of_date,evidence_ref,verified_by,verified_at FROM teaching_experience WHERE teacher_id=?",otherTeacher,f.teacher);
        jdbc.update("INSERT INTO teacher_workload_basis(teacher_id,semester_id,education_level_id,position_code,base_periods_per_week,unit,valid_from,valid_to,profile_ref,rule_definition_id,verification_status,verified_by,verified_at) SELECT ?,semester_id,education_level_id,position_code,base_periods_per_week,unit,valid_from,valid_to,profile_ref,rule_definition_id,verification_status,verified_by,verified_at FROM teacher_workload_basis WHERE teacher_id=?",otherTeacher,f.teacher);
        jdbc.update("INSERT INTO teacher_period_workload(teacher_id,calculation_period_id,record_type,teaching_periods,verification_status,evidence_ref,input_confirmation_json,input_confirmed_by,input_confirmed_at) SELECT ?,calculation_period_id,record_type,teaching_periods,verification_status,evidence_ref,input_confirmation_json,input_confirmed_by,input_confirmed_at FROM teacher_period_workload WHERE teacher_id=?",otherTeacher,f.teacher);
    }
    @AfterEach void release() throws Exception {
        engine.gates.values().forEach(g->g.release.countDown());
        long until=System.nanoTime()+TimeUnit.SECONDS.toNanos(10);
        while(jdbc.queryForObject("SELECT count(*) FROM solver_run WHERE status IN ('QUEUED','RUNNING','CANCEL_REQUESTED')",Long.class)>0&&System.nanoTime()<until) Thread.sleep(10);
    }
    PlanVersionDto draft() { return plans.create(f.round,new CreatePlanRequest(1L,1L),f.principal); }
    PlanVersionDto current() { return plans.current(f.round,f.principal); }
    long row(long version,long demand) { return jdbc.queryForObject("SELECT id FROM plan_demand WHERE plan_version_id=? AND demand_id=?",Long.class,version,demand); }
    String base(PlanVersionDto v) { return "/api/plan-versions/"+v.versionId()+"/assignments"; }
    ResultActions patchRow(PlanVersionDto v,long row,Long teacher) throws Exception {
        String body="{\"expected_revision\":"+v.revisionNo()+",\"teacher_id\":"+teacher+",\"change_reason\":\"Reviewed manual decision\""+(teacher==null?",\"unassigned_reason_code\":\"MANUAL_UNASSIGNED\",\"unassigned_reason_text\":\"Await manager decision\"":"")+"}";
        return mvc.perform(patch(base(v)+"/"+row).principal(f.principal).contentType(MediaType.APPLICATION_JSON).content(body));
    }
    ResultActions lockRow(PlanVersionDto v,long row,boolean lock) throws Exception {
        return mvc.perform(post(base(v)+"/"+row+(lock?"/lock":"/unlock")).principal(f.principal).contentType(MediaType.APPLICATION_JSON)
            .content("{\"expected_revision\":"+v.revisionNo()+",\"reason\":\"Confirmed component decision\"}"));
    }
    String group(PlanVersionDto v) {
        long classroom=jdbc.queryForObject("SELECT class_id FROM teaching_demand WHERE id=?",Long.class,f.demand);
        return "{\"expected_revision\":"+v.revisionNo()+",\"class_id\":"+classroom+",\"subject_id\":1,\"reason\":\"Confirmed complete group\"}";
    }
    void assignBoth(PlanVersionDto v) throws Exception {
        patchRow(v,row(v.versionId(),f.demand),f.teacher).andExpect(status().isOk());
        patchRow(current(),row(v.versionId(),extra),otherTeacher).andExpect(status().isOk());
    }
    long audits(long version) { return jdbc.queryForObject("SELECT count(*) FROM audit_log WHERE entity_type='PLAN_VERSION' AND entity_ref=? AND action LIKE 'MANUAL_ASSIGNMENT_%'",Long.class,Long.toString(version)); }
    SolverRunDto terminal(long id) throws Exception {
        long until=System.nanoTime()+TimeUnit.SECONDS.toNanos(10);
        do { var r=coordinator.get(id,f.principal); if(!Set.of("QUEUED","RUNNING","CANCEL_REQUESTED").contains(r.status())) return r; Thread.sleep(10); } while(System.nanoTime()<until);
        throw new AssertionError("Solver run did not finish");
    }
    @Test void editAssignAndUnassignUsesActualRevisionAndAudit() throws Exception {
        var v=draft();long id=row(v.versionId(),f.demand);
        patchRow(v,id,f.teacher).andExpect(status().isOk()).andExpect(jsonPath("changed_count").value(1))
            .andExpect(jsonPath("version.revision_no").value(v.revisionNo()+1)).andExpect(jsonPath("items[0].teacher_id").value(f.teacher));
        var loads=results.workloads(v.versionId(),f.teacher,50,0,f.principal);assertEquals(0,loads.items().get(0).a().compareTo(new java.math.BigDecimal("3")));
        assertEquals(1,audits(v.versionId()));
        patchRow(current(),id,null).andExpect(status().isOk()).andExpect(jsonPath("items[0].unassigned_reason_code").value("MANUAL_UNASSIGNED"));
        assertEquals(2,audits(v.versionId()));assertEquals(v.revisionNo()+2,current().revisionNo());
        assertEquals(f.actor,jdbc.queryForObject("SELECT actor_id FROM audit_log WHERE action='MANUAL_ASSIGNMENT_UPDATE' AND entity_ref=? ORDER BY id DESC LIMIT 1",Long.class,Long.toString(v.versionId())));
    }
    @Test void wholeGroupLocksDifferentTeachersAndUnlocksPerChangedRow() throws Exception {
        var v=draft();assignBoth(v);v=current();long before=v.revisionNo();
        mvc.perform(post(base(v)+"/locks").principal(f.principal).contentType(MediaType.APPLICATION_JSON).content(group(v)))
            .andExpect(status().isOk()).andExpect(jsonPath("matched_count").value(2)).andExpect(jsonPath("changed_count").value(2)).andExpect(jsonPath("version.revision_no").value(before+2));
        assertEquals(2,current().lockedCount());assertEquals(2,jdbc.queryForObject("SELECT count(DISTINCT teacher_id) FROM plan_demand WHERE plan_version_id=?",Long.class,v.versionId()));
        var locked=current();var original=jdbc.queryForList("SELECT locked_by,locked_at,lock_reason FROM plan_demand WHERE plan_version_id=? ORDER BY id",v.versionId());
        mvc.perform(post(base(locked)+"/locks").principal(f.principal).contentType(MediaType.APPLICATION_JSON).content(group(locked))).andExpect(status().isOk()).andExpect(jsonPath("changed_count").value(0));
        assertEquals(original,jdbc.queryForList("SELECT locked_by,locked_at,lock_reason FROM plan_demand WHERE plan_version_id=? ORDER BY id",v.versionId()));assertEquals(locked.revisionNo(),current().revisionNo());
        mvc.perform(post(base(locked)+"/unlocks").principal(f.principal).contentType(MediaType.APPLICATION_JSON).content(group(locked))).andExpect(status().isOk()).andExpect(jsonPath("version.revision_no").value(before+4));
        assertEquals(0,current().lockedCount());
    }
    @Test void groupLockRejectsUnassignedWithoutPartialChanges() throws Exception {
        var v=draft();patchRow(v,row(v.versionId(),f.demand),f.teacher).andExpect(status().isOk());v=current();long count=audits(v.versionId());
        mvc.perform(post(base(v)+"/locks").principal(f.principal).contentType(MediaType.APPLICATION_JSON).content(group(v)))
            .andExpect(status().isConflict()).andExpect(jsonPath("code").value("ASSIGNMENT_NOT_ASSIGNED"));
        assertEquals(v.revisionNo(),current().revisionNo());assertEquals(0,current().lockedCount());assertEquals(count,audits(v.versionId()));
    }
    @Test void selectionIdsAreRowIdsScopedToVersionAndValidated() throws Exception {
        var v=draft();assignBoth(v);v=current();long id=row(v.versionId(),f.demand);
        for(String selector:List.of("\"assignment_ids\":["+id+","+id+"]","\"assignment_ids\":[]","\"class_id\":1","\"assignment_ids\":["+id+"],\"subject_id\":1")) {
            mvc.perform(post(base(v)+"/locks").principal(f.principal).contentType(MediaType.APPLICATION_JSON)
                .content("{\"expected_revision\":"+v.revisionNo()+",\"reason\":\"review\","+selector+"}")).andExpect(status().isBadRequest());
        }
        mvc.perform(post(base(v)+"/locks").principal(f.principal).contentType(MediaType.APPLICATION_JSON)
            .content("{\"expected_revision\":"+v.revisionNo()+",\"reason\":\"review\",\"assignment_ids\":["+id+",9223372036854775806]}" )).andExpect(status().isNotFound());
        assertEquals(0,current().lockedCount());
        mvc.perform(post(base(v)+"/locks").principal(f.principal).contentType(MediaType.APPLICATION_JSON)
            .content("{\"expected_revision\":"+v.revisionNo()+",\"reason\":\"review\",\"assignment_ids\":["+id+"]}")).andExpect(status().isOk()).andExpect(jsonPath("changed_count").value(1));
    }
    @Test void lockedEditAndOldRevisionAreRejected() throws Exception {
        var v=draft();long id=row(v.versionId(),f.demand);patchRow(v,id,f.teacher).andExpect(status().isOk());v=current();
        lockRow(v,id,true).andExpect(status().isOk());
        patchRow(current(),id,otherTeacher).andExpect(status().isConflict()).andExpect(jsonPath("code").value("ASSIGNMENT_LOCKED"));
        lockRow(v,id,false).andExpect(status().isConflict()).andExpect(jsonPath("code").value("REVISION_CONFLICT"));
    }
    @Test void invalidTeacherAndOverloadAreRejectedBeforeAnyWrite() throws Exception {
        var v=draft();long id=row(v.versionId(),f.demand);
        patchRow(v,id,9223372036854775806L).andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("code").value("ASSIGNMENT_INELIGIBLE"));
        assertEquals(v.revisionNo(),current().revisionNo());assertEquals(0,audits(v.versionId()));
        jdbc.update("UPDATE teaching_demand SET periods_per_week=30 WHERE id=?",f.demand);
        v=plans.refresh(v.versionId(),new RefreshPlanSnapshotRequest(v.revisionNo(),1L,1L),f.principal);
        patchRow(v,id,f.teacher).andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("code").value("ASSIGNMENT_HARD_VIOLATION"));
        assertNull(jdbc.queryForObject("SELECT teacher_id FROM plan_demand WHERE id=?",Long.class,id));assertEquals(v.revisionNo(),current().revisionNo());
    }
    @Test void explicitNullReasonsAndUnknownFieldsAreValidated() throws Exception {
        var v=draft();long id=row(v.versionId(),f.demand);
        for(String tail:List.of("",",\"teacher_id\":null",",\"teacher_id\":-1",",\"teacher_id\":"+f.teacher+",\"actor_id\":1",",\"teacher_id\":"+f.teacher+",\"periods_per_week\":99",",\"teacher_id\":"+f.teacher+",\"unassigned_reason_code\":\"NO\"")) {
            mvc.perform(patch(base(v)+"/"+id).principal(f.principal).contentType(MediaType.APPLICATION_JSON)
                .content("{\"expected_revision\":"+v.revisionNo()+",\"change_reason\":\"review\""+tail+"}")).andExpect(status().isBadRequest());
        }
        assertEquals(v.revisionNo(),current().revisionNo());
    }
    @Test void exactEditAndRepeatedUnlockAreNoOps() throws Exception {
        var v=draft();long id=row(v.versionId(),f.demand);patchRow(v,id,f.teacher).andExpect(status().isOk());v=current();long count=audits(v.versionId());
        patchRow(v,id,f.teacher).andExpect(status().isOk()).andExpect(jsonPath("changed_count").value(0));
        lockRow(v,id,false).andExpect(status().isOk()).andExpect(jsonPath("changed_count").value(0));
        assertEquals(v.revisionNo(),current().revisionNo());assertEquals(count,audits(v.versionId()));
    }
    @Test void pureUnlockResolvesStaleSnapshotAndChangedPeriods() throws Exception {
        var v=draft();long id=row(v.versionId(),f.demand);patchRow(v,id,f.teacher).andExpect(status().isOk());lockRow(current(),id,true).andExpect(status().isOk());v=current();
        jdbc.update("UPDATE teaching_demand SET periods_per_week=4 WHERE id=?",f.demand);
        patchRow(v,id,otherTeacher).andExpect(status().isConflict()).andExpect(jsonPath("code").value("STALE_INPUT"));
        lockRow(v,id,true).andExpect(status().isConflict()).andExpect(jsonPath("code").value("STALE_INPUT"));
        lockRow(v,id,false).andExpect(status().isOk()).andExpect(jsonPath("version.snapshot_fresh").value(false)).andExpect(jsonPath("items[0].teacher_id").value(f.teacher)).andExpect(jsonPath("items[0].periods_per_week").value(3));
        var fresh=plans.refresh(v.versionId(),new RefreshPlanSnapshotRequest(current().revisionNo(),1L,1L),f.principal);
        assertTrue(fresh.snapshotFresh());assertEquals(0,jdbc.queryForObject("SELECT periods_per_week_snapshot FROM plan_demand WHERE id=?",java.math.BigDecimal.class,id).compareTo(new java.math.BigDecimal("4")));
    }
    @Test void unlockAfterTeacherBecomesIneligibleDoesNotAlterDecision() throws Exception {
        var v=draft();long id=row(v.versionId(),f.demand);patchRow(v,id,f.teacher).andExpect(status().isOk());lockRow(current(),id,true).andExpect(status().isOk());v=current();
        jdbc.update("UPDATE teacher_employment SET employment_status='INACTIVE' WHERE teacher_id=?",f.teacher);
        lockRow(v,id,false).andExpect(status().isOk()).andExpect(jsonPath("items[0].teacher_id").value(f.teacher));
        assertFalse(current().snapshotFresh());
    }
    @Test void databaseUnlockExceptionNeverAllowsChangingTheDecision() throws Exception {
        var v=draft();long id=row(v.versionId(),f.demand);patchRow(v,id,f.teacher).andExpect(status().isOk());lockRow(current(),id,true).andExpect(status().isOk());v=current();
        jdbc.update("UPDATE teaching_demand SET periods_per_week=4 WHERE id=?",f.demand);
        assertThrows(org.springframework.dao.DataAccessException.class,()->jdbc.update("UPDATE plan_demand SET is_locked=false,locked_by=NULL,locked_at=NULL,lock_reason=NULL,teacher_id=? WHERE id=?",otherTeacher,id));
        assertEquals(v.revisionNo(),current().revisionNo());assertEquals(1,current().lockedCount());
        assertEquals(f.teacher,jdbc.queryForObject("SELECT teacher_id FROM plan_demand WHERE id=?",Long.class,id));
    }
    @Test void authScopeAndForeignRowCannotWrite() throws Exception {
        var v=draft();long id=row(v.versionId(),f.demand);String body="{\"expected_revision\":"+v.revisionNo()+",\"reason\":\"review\"}";
        mvc.perform(post(base(v)+"/"+id+"/unlock").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
        mvc.perform(post(base(v)+"/"+id+"/unlock").principal(()->"does-not-exist").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        var other=new RoundReadinessPostgresTest();other.jdbc=jdbc;other.fixture();
        mvc.perform(post(base(v)+"/"+id+"/unlock").principal(other.principal).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        var foreign=plans.create(other.round,new CreatePlanRequest(1L,1L),other.principal);
        lockRow(v,row(foreign.versionId(),other.demand),false).andExpect(status().isNotFound());
    }
    @Test void historicalVersionCannotBeEditedOrUnlocked() throws Exception {
        var v=draft();long id=row(v.versionId(),f.demand);
        long next=jdbc.queryForObject("INSERT INTO plan_version(plan_id,version_no,status,input_snapshot_id,source_version_id,created_by) VALUES(?,2,'DRAFT',?,?,?) RETURNING id",Long.class,v.planId(),v.inputSnapshotId(),v.versionId(),f.actor);
        jdbc.update("UPDATE assignment_plan SET current_version_id=? WHERE id=?",next,v.planId());
        patchRow(v,id,f.teacher).andExpect(status().isConflict()).andExpect(jsonPath("code").value("CURRENT_DRAFT_REQUIRED"));
        lockRow(v,id,false).andExpect(status().isConflict()).andExpect(jsonPath("code").value("CURRENT_DRAFT_REQUIRED"));
    }
    @Test void batchFailureRollsBackRowsRevisionAndAudit() throws Exception {
        var v=draft();assignBoth(v);v=current();long failing=row(v.versionId(),extra),count=audits(v.versionId());
        jdbc.execute("CREATE FUNCTION test_manual_lock_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id="+failing+" AND NEW.is_locked THEN RAISE EXCEPTION 'controlled failure' USING ERRCODE='23514'; END IF; RETURN NEW; END $$");
        jdbc.execute("CREATE TRIGGER a_test_manual_lock_failure BEFORE UPDATE ON plan_demand FOR EACH ROW EXECUTE FUNCTION test_manual_lock_failure()");
        try {
            mvc.perform(post(base(v)+"/locks").principal(f.principal).contentType(MediaType.APPLICATION_JSON).content(group(v))).andExpect(status().isUnprocessableEntity());
            assertEquals(0,current().lockedCount());assertEquals(v.revisionNo(),current().revisionNo());assertEquals(count,audits(v.versionId()));
        } finally { jdbc.execute("DROP TRIGGER a_test_manual_lock_failure ON plan_demand");jdbc.execute("DROP FUNCTION test_manual_lock_failure()"); }
    }
    @Test void concurrentEditsWithSameRevisionHaveOneWinner() throws Exception {
        var v=draft();long id=row(v.versionId(),f.demand);var pool=Executors.newFixedThreadPool(2);var start=new CountDownLatch(1);
        try {
            var calls=new ArrayList<Future<String>>();
            for(long teacher:List.of(f.teacher,otherTeacher)) calls.add(pool.submit(()->{start.await();try { assignments.update(v.versionId(),id,new UpdateAssignmentRequest(v.revisionNo(),teacher,null,null,"Concurrent decision"),f.principal);return "OK";}catch(vn.edu.tass.backend.exception.PlanOperationException e){return e.getCode();}}));
            start.countDown();var values=new HashSet<String>();for(var c:calls) values.add(c.get(10,TimeUnit.SECONDS));
            assertEquals(Set.of("OK","REVISION_CONFLICT"),values);assertEquals(v.revisionNo()+1,current().revisionNo());assertEquals(1,audits(v.versionId()));
        } finally { pool.shutdownNow(); }
    }
    @Test void editsInvalidateStoredValidation() throws Exception {
        var v=draft();assignBoth(v);v=current();var report=results.validate(v.versionId(),v.revisionNo(),f.principal);assertTrue(report.fresh());
        lockRow(v,row(v.versionId(),f.demand),true).andExpect(status().isOk());
        assertFalse(results.validation(v.versionId(),report.id(),f.principal).fresh());
    }
    @Test void editDuringSolveMakesLateResultStale() throws Exception {
        var v=draft();var gate=engine.block(v.versionId(),false);
        try {
            var run=coordinator.submit(v.versionId(),new StartSolverRunRequest(v.revisionNo(),1L,1L),f.principal);
            assertTrue(gate.entered.await(5,TimeUnit.SECONDS));
            patchRow(v,row(v.versionId(),f.demand),f.teacher).andExpect(status().isOk());gate.release.countDown();
            var finished=terminal(run.id());assertEquals("STALE",finished.summary().path("apply_outcome").asText());
            assertEquals(f.teacher,jdbc.queryForObject("SELECT teacher_id FROM plan_demand WHERE plan_version_id=? AND demand_id=?",Long.class,v.versionId(),f.demand));
        } finally { gate.release.countDown(); }
    }
    @Test void httpLocksSurviveSubsequentNativeSolveAndApply() throws Exception {
        var v=draft();assignBoth(v);v=current();mvc.perform(post(base(v)+"/locks").principal(f.principal).contentType(MediaType.APPLICATION_JSON).content(group(v))).andExpect(status().isOk());v=current();
        var before=jdbc.queryForList("SELECT * FROM plan_demand WHERE plan_version_id=? ORDER BY id",v.versionId());
        var run=coordinator.submit(v.versionId(),new StartSolverRunRequest(v.revisionNo(),1L,1L),f.principal);assertEquals("APPLIED",terminal(run.id()).summary().path("apply_outcome").asText());
        assertEquals(before,jdbc.queryForList("SELECT * FROM plan_demand WHERE plan_version_id=? ORDER BY id",v.versionId()));assertEquals(v.revisionNo(),current().revisionNo());
    }
}
