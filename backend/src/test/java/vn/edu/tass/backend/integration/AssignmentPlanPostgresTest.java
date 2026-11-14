package vn.edu.tass.backend.integration;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.Principal;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.edu.tass.backend.exception.PlanOperationException;
import vn.edu.tass.backend.payload.dto.PlanVersionDto;
import vn.edu.tass.backend.payload.request.CreatePlanRequest;
import vn.edu.tass.backend.payload.request.RefreshPlanSnapshotRequest;
import vn.edu.tass.backend.service.AssignmentPlanService;
import vn.edu.tass.testing.PlanApiTestConfiguration;

/** Opt-in: use a disposable PostgreSQL database loaded with 01_schema.sql and 02_seed.sql.
 * These tests commit data to exercise independent concurrent transactions. */
@EnabledIfSystemProperty(named = "plan.integration", matches = "true")
@SpringBootTest(classes = PlanApiTestConfiguration.class)
@AutoConfigureMockMvc
class AssignmentPlanPostgresTest {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) {
        String url = System.getProperty("plan.test.url");
        if (url == null || url.isBlank()) throw new IllegalStateException("plan.test.url must name a disposable PostgreSQL database");
        properties.add("spring.datasource.url", () -> url);
        properties.add("spring.datasource.username", () -> System.getProperty("plan.test.user", "tass"));
        properties.add("spring.datasource.password", () -> System.getProperty("plan.test.password", ""));
        properties.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        properties.add("spring.jpa.hibernate.ddl-auto", () -> "none");
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired AssignmentPlanService plans;
    @Autowired PlatformTransactionManager transactions;
    long actorId, roundId, classId, teacherId, firstDemand, secondDemand;
    Principal manager;

    @BeforeEach
    void fixture() {
        String key = UUID.randomUUID().toString();
        manager = () -> "plan-test-" + key;
        actorId = jdbc.queryForObject("""
            INSERT INTO user_account(school_id,login_name,credential_hash,status)
            VALUES(1,?,'!TEST_NO_PASSWORD!','ACTIVE') RETURNING id
            """, Long.class, manager.getName());
        jdbc.update("INSERT INTO user_role(user_id,role_id) VALUES(?,1)", actorId);
        jdbc.update("""
            INSERT INTO manager_scope(user_id,grade_id,academic_year_id,valid_from,valid_to)
            SELECT ?,id,1,'2026-08-01','2027-07-31' FROM grade
            """, actorId);
        classId = jdbc.queryForObject("INSERT INTO school_class(academic_year_id,grade_id,class_code,status) VALUES(1,1,?,'ACTIVE') RETURNING id", Long.class, "PLAN-" + key);
        teacherId = jdbc.queryForObject("INSERT INTO teacher(school_id,teacher_code,full_name) VALUES(1,?,'Plan test teacher') RETURNING id", Long.class, "PLAN-" + key);
        jdbc.update("""
            INSERT INTO teacher_employment(teacher_id,department_id,semester_id,employment_status,position_code,valid_from,valid_to)
            VALUES(?,1,1,'TEACHING','TEACHER','2026-08-01','2026-12-31')
            """, teacherId);
        jdbc.update("""
            INSERT INTO teaching_qualification(teacher_id,subject_id,education_level_id,verification_status,
              verified_by,verified_at,evidence_ref,valid_from,valid_to)
            VALUES(?,1,1,'VERIFIED',?,now(),'plan-test','2026-08-01','2026-12-31')
            """, teacherId, actorId);
        roundId = jdbc.queryForObject("INSERT INTO assignment_round(semester_id,round_code,status) VALUES(1,?,'PREPARING') RETURNING id", Long.class, "PLAN-" + key);
        long scope = jdbc.queryForObject("INSERT INTO round_subject_scope(round_id,grade_id,subject_id) VALUES(?,1,1) RETURNING id", Long.class, roundId);
        jdbc.update("INSERT INTO class_subject_applicability(scope_id,class_id,status,updated_by) VALUES(?,?,'APPLICABLE',?)", scope, classId, actorId);
        firstDemand = demand("STANDARD", 2);
        secondDemand = demand("SPECIALIZED_TOPIC", 3);
    }

    private long demand(String type, int periods) {
        return jdbc.queryForObject("""
            INSERT INTO teaching_demand(semester_id,class_id,subject_id,periods_per_week,status,updated_by,
              demand_type,valid_from,valid_to,unit)
            VALUES(1,?,1,?,'ACTIVE',?,?,'2026-08-01','2026-12-31','PERIOD_PER_WEEK') RETURNING id
            """, Long.class, classId, periods, actorId, type);
    }

    private PlanVersionDto create() { return plans.create(roundId, new CreatePlanRequest(1L, 1L), manager); }
    private RefreshPlanSnapshotRequest refreshRequest(long revision) { return new RefreshPlanSnapshotRequest(revision, 1L, 1L); }
    private long count(String table) { return jdbc.queryForObject("SELECT count(*) FROM " + table, Long.class); }
    private void assign(PlanVersionDto v, boolean lock) {
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            jdbc.queryForObject("SELECT set_config('tass.actor_id',?,true)", String.class, Long.toString(actorId));
            jdbc.update("""
                UPDATE plan_demand SET teacher_id=?,unassigned_reason_code=NULL,unassigned_reason_text=NULL,
                  is_locked=?,locked_by=?,locked_at=CASE WHEN ? THEN now() END,
                  lock_reason=CASE WHEN ? THEN 'Test confirmed lock' END
                WHERE plan_version_id=? AND demand_id=?
                """, teacherId, lock, lock ? actorId : null, lock, lock, v.versionId(), firstDemand);
        });
    }

    @Test
    void createsCurrentDraftWithSnapshotAssignmentsRevisionAndAudit() throws Exception {
        var response = mvc.perform(post("/api/assignment-rounds/{id}/plan", roundId).principal(manager)
            .contentType(MediaType.APPLICATION_JSON).content("{\"optimization_config_id\":1,\"rule_set_version_id\":1}"))
            .andExpect(status().isCreated()).andReturn().getResponse();
        JsonNode body = json.readTree(response.getContentAsString());
        long version = body.path("version_id").asLong();
        assertEquals("/api/plan-versions/" + version, response.getHeader("Location"));
        assertEquals("DRAFT", body.path("status").asText());
        assertEquals(2, body.path("revision_no").asLong());
        assertEquals(2, body.path("demand_count").asLong());
        assertTrue(body.path("is_current").asBoolean());
        assertTrue(body.path("snapshot_fresh").asBoolean());
        assertEquals(actorId, body.path("created_by").asLong());
        assertFalse(body.has("payload_json"));
        assertTrue(jdbc.queryForObject("SELECT content_hash=md5(payload_json::text) FROM input_snapshot WHERE id=?", Boolean.class, body.path("input_snapshot_id").asLong()));
        assertEquals("false", jdbc.queryForObject("SELECT payload_json->>'solver_input_ready' FROM input_snapshot WHERE id=?", String.class, body.path("input_snapshot_id").asLong()));
        assertEquals(2L, jdbc.queryForObject("SELECT count(*) FROM plan_demand WHERE plan_version_id=? AND teacher_id IS NULL AND unassigned_reason_code='NOT_ASSIGNED'", Long.class, version));
        assertEquals(2L, jdbc.queryForObject("SELECT count(*) FROM audit_log WHERE actor_id=? AND action='ASSIGNMENT_INSERT'", Long.class, actorId));
        mvc.perform(get("/api/assignment-rounds/{id}/plan", roundId).principal(manager))
            .andExpect(status().isOk()).andExpect(jsonPath("$.version_id").value(version));
        mvc.perform(get("/api/plan-versions/{id}", version).principal(manager))
            .andExpect(status().isOk()).andExpect(jsonPath("$.revision_no").value(2));
    }

    @Test
    void refreshReconcilesDemandsAndReturnsTriggerOwnedRevision() {
        var initial = create();
        assign(initial, false);
        var before = plans.version(initial.versionId(), manager);
        jdbc.update("UPDATE teaching_demand SET periods_per_week=4 WHERE id=?", firstDemand);
        jdbc.update("UPDATE teaching_demand SET status='INACTIVE' WHERE id=?", secondDemand);
        long added = demand("ENRICHMENT", 1);
        assertFalse(plans.current(roundId, manager).snapshotFresh());
        var result = plans.refresh(before.versionId(), refreshRequest(before.revisionNo()), manager);
        assertTrue(result.snapshotFresh());
        assertNotEquals(before.inputSnapshotId(), result.inputSnapshotId());
        assertEquals(before.revisionNo() + 4, result.revisionNo()); // snapshot + update + delete + insert
        assertEquals(2, result.demandCount());
        assertEquals(teacherId, jdbc.queryForObject("SELECT teacher_id FROM plan_demand WHERE plan_version_id=? AND demand_id=?", Long.class, result.versionId(), firstDemand));
        assertEquals(0L, jdbc.queryForObject("SELECT count(*) FROM plan_demand WHERE plan_version_id=? AND demand_id=?", Long.class, result.versionId(), secondDemand));
        assertEquals("NOT_ASSIGNED", jdbc.queryForObject("SELECT unassigned_reason_code FROM plan_demand WHERE plan_version_id=? AND demand_id=?", String.class, result.versionId(), added));
        assertEquals(result, plans.current(roundId, manager));
    }

    @Test
    void validLocksSurviveRefreshWithoutReplacingTheirRows() {
        var v = create();
        assign(v, true);
        var before = plans.current(roundId, manager);
        var row = jdbc.queryForMap("SELECT * FROM plan_demand WHERE plan_version_id=? AND demand_id=?", v.versionId(), firstDemand);
        jdbc.update("UPDATE teacher SET full_name='Changed source name' WHERE id=?", teacherId);
        var after = plans.refresh(v.versionId(), refreshRequest(before.revisionNo()), manager);
        assertEquals(before.revisionNo() + 1, after.revisionNo());
        assertEquals(row, jdbc.queryForMap("SELECT * FROM plan_demand WHERE plan_version_id=? AND demand_id=?", v.versionId(), firstDemand));
        assertEquals(1, after.lockedCount());
    }

    @Test
    void conflictingLockRollsBackSnapshotAndAllPlanChanges() {
        var v = create();
        assign(v, true);
        var before = plans.current(roundId, manager);
        jdbc.update("UPDATE teaching_demand SET periods_per_week=7 WHERE id=?", firstDemand);
        long snapshots = count("input_snapshot");
        var error = assertThrows(PlanOperationException.class,
            () -> plans.refresh(v.versionId(), refreshRequest(before.revisionNo()), manager));
        assertEquals("LOCK_CONFLICT", error.getCode());
        assertEquals(snapshots, count("input_snapshot"));
        var after = plans.current(roundId, manager);
        assertEquals(before.inputSnapshotId(), after.inputSnapshotId());
        assertEquals(before.revisionNo(), after.revisionNo());
        assertFalse(after.snapshotFresh());
        assertEquals(1, after.lockedCount());
    }

    @Test
    void refreshUnassignsUnlockedTeacherWhoIsNoLongerEligible() {
        var v = create();
        assign(v, false);
        var before = plans.current(roundId, manager);
        jdbc.update("UPDATE teaching_qualification SET verification_status='INACTIVE' WHERE teacher_id=?", teacherId);
        var after = plans.refresh(v.versionId(), refreshRequest(before.revisionNo()), manager);
        assertEquals(before.revisionNo() + 2, after.revisionNo());
        assertEquals("INELIGIBLE_AFTER_REFRESH", jdbc.queryForObject(
            "SELECT unassigned_reason_code FROM plan_demand WHERE plan_version_id=? AND demand_id=?", String.class, v.versionId(), firstDemand));
    }

    @Test
    void staleRevisionAndHistoricalVersionCannotBeRefreshed() throws Exception {
        var v = create();
        mvc.perform(post("/api/plan-versions/{id}/refresh-snapshot", v.versionId()).principal(manager)
            .contentType(MediaType.APPLICATION_JSON).content("{\"expected_revision\":0,\"optimization_config_id\":1,\"rule_set_version_id\":1}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("REVISION_CONFLICT"));
        assertFalse(plans.version(1, manager).isCurrent());
        var history = assertThrows(PlanOperationException.class, () -> plans.refresh(1, refreshRequest(0), manager));
        assertEquals("CURRENT_DRAFT_REQUIRED", history.getCode());
    }

    @Test
    void rejectsUnauthenticatedDisabledAndOutOfScopeAccountsAndClientActor() throws Exception {
        mvc.perform(get("/api/assignment-rounds/{id}/plan", roundId)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/assignment-rounds/{id}/plan", roundId).principal(() -> "demo.manager"))
            .andExpect(status().isForbidden());
        jdbc.update("DELETE FROM manager_scope WHERE user_id=?", actorId);
        mvc.perform(get("/api/assignment-rounds/{id}/plan", roundId).principal(manager))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("PLAN_ACCESS_DENIED"));
        mvc.perform(post("/api/assignment-rounds/{id}/plan", roundId).principal(manager)
            .contentType(MediaType.APPLICATION_JSON).content("{\"optimization_config_id\":1,\"rule_set_version_id\":1,\"created_by\":1}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void unconfirmedConfigurationCannotCreatePartialPlan() {
        long snapshots = count("input_snapshot");
        var error = assertThrows(PlanOperationException.class,
            () -> plans.create(roundId, new CreatePlanRequest(Long.MAX_VALUE, 1L), manager));
        assertEquals("CONFIGURATION_NOT_CONFIRMED", error.getCode());
        assertEquals(snapshots, count("input_snapshot"));
        assertEquals(0L, jdbc.queryForObject("SELECT count(*) FROM assignment_plan WHERE round_id=?", Long.class, roundId));
    }

    @Test
    void failureDuringDemandBatchRollsBackTheEntireInitialization() {
        long snapshots = count("input_snapshot");
        String suffix = Long.toString(roundId);
        jdbc.execute("CREATE FUNCTION test_reject_plan_" + suffix + "() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.demand_id=" + secondDemand + " THEN RAISE EXCEPTION 'test batch failure' USING ERRCODE='23514'; END IF; RETURN NEW; END $$");
        jdbc.execute("CREATE TRIGGER test_reject_plan_" + suffix + " BEFORE INSERT ON plan_demand FOR EACH ROW EXECUTE FUNCTION test_reject_plan_" + suffix + "()");
        try {
            assertThrows(org.springframework.dao.DataIntegrityViolationException.class, this::create);
            assertEquals(snapshots, count("input_snapshot"));
            assertEquals(0L, jdbc.queryForObject("SELECT count(*) FROM assignment_plan WHERE round_id=?", Long.class, roundId));
            assertEquals(0L, jdbc.queryForObject("SELECT count(*) FROM audit_log WHERE actor_id=?", Long.class, actorId));
        } finally {
            jdbc.execute("DROP TRIGGER test_reject_plan_" + suffix + " ON plan_demand");
            jdbc.execute("DROP FUNCTION test_reject_plan_" + suffix + "()");
        }
    }

    @Test
    void twoConcurrentCreatesProduceExactlyOneCompleteDraft() throws Exception {
        var outcomes = concurrent(() -> create());
        assertEquals(1, outcomes.stream().filter("SUCCESS"::equals).count());
        assertEquals(1, outcomes.stream().filter("PLAN_ALREADY_EXISTS"::equals).count());
        assertEquals(2, plans.current(roundId, manager).revisionNo());
        assertEquals(1L, jdbc.queryForObject("SELECT count(*) FROM input_snapshot WHERE round_id=?", Long.class, roundId));
    }

    @Test
    void twoConcurrentRefreshesWithSameRevisionHaveOneWinner() throws Exception {
        var v = create();
        var outcomes = concurrent(() -> plans.refresh(v.versionId(), refreshRequest(v.revisionNo()), manager));
        assertEquals(1, outcomes.stream().filter("SUCCESS"::equals).count());
        assertEquals(1, outcomes.stream().filter("REVISION_CONFLICT"::equals).count());
        assertEquals(v.revisionNo() + 1, plans.current(roundId, manager).revisionNo());
        assertEquals(2L, jdbc.queryForObject("SELECT count(*) FROM input_snapshot WHERE round_id=?", Long.class, roundId));
    }

    private List<String> concurrent(Callable<PlanVersionDto> action) throws Exception {
        var pool = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);
        Callable<String> job = () -> {
            assertTrue(start.await(10, TimeUnit.SECONDS));
            try { action.call(); return "SUCCESS"; }
            catch (PlanOperationException e) { return e.getCode(); }
        };
        try {
            var first = pool.submit(job);
            var second = pool.submit(job);
            start.countDown();
            return List.of(first.get(30, TimeUnit.SECONDS), second.get(30, TimeUnit.SECONDS));
        } finally {
            pool.shutdownNow();
        }
    }
}
