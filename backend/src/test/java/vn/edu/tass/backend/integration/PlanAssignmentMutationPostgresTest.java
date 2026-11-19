package vn.edu.tass.backend.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@EnabledIfSystemProperty(named = "db.integration", matches = "true")
@SpringBootTest
@AutoConfigureMockMvc
class PlanAssignmentMutationPostgresTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    @Test
    @Transactional
    void unassignsThenAssignsWithAtomicRevisionAuditAndNoOp() throws Exception {
        long revision = revision(2);
        int auditBefore = auditCount();
        JsonNode unassigned = change(2, 2, revision, token(1),
            "\"teacher_id\":null,\"unassigned_reason_code\":\"MANUAL_REVIEW\","
                + "\"unassigned_reason_text\":\"Review assignment\"");
        assertEquals("UNASSIGNED", unassigned.path("coverage_status").asText());
        assertEquals(revision + 1, unassigned.path("revision_no").asLong());
        assertEquals("MANUAL_REVIEW", unassigned.path("unassigned_reason_code").asText());
        assertEquals(auditBefore + 1, auditCount());
        assertNull(jdbc.queryForObject("SELECT teacher_id FROM plan_demand WHERE plan_version_id=2 AND demand_id=2",
            Long.class));

        JsonNode assigned = change(2, 2, revision + 1, token(1), "\"teacher_id\":2");
        assertEquals("ASSIGNED", assigned.path("coverage_status").asText());
        assertEquals(2, assigned.path("teacher_id").asLong());
        assertEquals(revision + 2, assigned.path("revision_no").asLong());
        assertTrue(assigned.path("unassigned_reason_code").isNull());
        assertEquals(auditBefore + 2, auditCount());

        JsonNode noOp = change(2, 2, revision + 2, token(1), "\"teacher_id\":2");
        assertEquals(revision + 2, noOp.path("revision_no").asLong());
        assertEquals(auditBefore + 2, auditCount());
    }

    @Test
    @Transactional
    void rejectsStaleRevisionHistoricalVersionAndLockedAssignment() throws Exception {
        long revision = revision(2);
        int auditBefore = auditCount();
        mvc.perform(patch("/api/plan-versions/2/assignments/2")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(revision - 1, token(1), "\"teacher_id\":2")))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("STALE_REVISION"));
        mvc.perform(patch("/api/plan-versions/1/assignments/2")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(revision(1), token(1), "\"teacher_id\":2")))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("PLAN_VERSION_NOT_CURRENT"));
        mvc.perform(patch("/api/plan-versions/2/assignments/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(revision, token(1), "\"teacher_id\":2")))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("LOCK_CONFLICT"));
        assertEquals(revision, revision(2));
        assertEquals(auditBefore, auditCount());
    }

    @Test
    @Transactional
    void rejectsStaleSourceIneligibleTeacherAndMissingUnassignmentReason() throws Exception {
        long revision = revision(2);
        mvc.perform(patch("/api/plan-versions/2/assignments/2")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(revision, token(1), "\"teacher_id\":4")))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("TEACHER_INELIGIBLE"));
        mvc.perform(patch("/api/plan-versions/2/assignments/2")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(revision, token(1), "\"teacher_id\":null")))
            .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/plan-versions/2/assignments/2")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(revision, "stale-token", "\"teacher_id\":2")))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("STALE_SOURCE_REVISION"));
        assertEquals(revision, revision(2));
    }

    @Test
    @Transactional
    void createsPlanRowForRequiredDemandWithNoPreviousAssignment() throws Exception {
        long versionId = createPlanForRoundTwo();
        JsonNode assigned = change(versionId, 4, 0, token(2), "\"teacher_id\":3");
        assertEquals(1, assigned.path("revision_no").asLong());
        assertEquals(4, assigned.path("demand_id").asLong());
        assertEquals(3, assigned.path("teacher_id").asLong());
        assertEquals(1, jdbc.queryForObject(
            "SELECT count(*) FROM plan_demand WHERE plan_version_id=? AND demand_id=4",
            Integer.class, versionId));
    }

    @Test
    @Transactional
    void rejectsConfiguredOverloadWithoutCreatingAssignment() throws Exception {
        jdbc.update("""
            UPDATE optimization_config SET criteria_weights_json =
                jsonb_set(criteria_weights_json, '{hard_limits,max_total_weekly}', '1'::jsonb)
            WHERE id = 1
            """);
        long versionId = createPlanForRoundTwo();
        mvc.perform(patch("/api/plan-versions/{id}/assignments/4", versionId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(0, token(2), "\"teacher_id\":3")))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("WORKLOAD_LIMIT_EXCEEDED"));
        assertEquals(0, revision(versionId));
        assertEquals(0, jdbc.queryForObject(
            "SELECT count(*) FROM plan_demand WHERE plan_version_id=?", Integer.class, versionId));
    }

    @Test
    @Transactional
    void reportsMissingWeeklyInputRatherThanTreatingItAsZero() throws Exception {
        jdbc.update("UPDATE teacher_period_workload SET verification_status='PENDING' WHERE id=3");
        long versionId = createPlanForRoundTwo();
        mvc.perform(patch("/api/plan-versions/{id}/assignments/4", versionId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(0, token(2), "\"teacher_id\":3")))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("INSUFFICIENT_WORKLOAD_DATA"));
        assertEquals(0, revision(versionId));
    }

    @Test
    @Transactional
    void permitsCleaningUpSavedDemandOutsideRequiredSetButNotCreatingAnother() throws Exception {
        long versionId = createPlanForRoundTwo();
        mvc.perform(patch("/api/plan-versions/{id}/assignments/7", versionId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(0, token(2), "\"teacher_id\":3")))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("DEMAND_NOT_IN_REQUIRED_SNAPSHOT"));
        long revision = revision(2);
        JsonNode cleaned = change(2, 7, revision, token(1),
            "\"teacher_id\":null,\"unassigned_reason_code\":\"OUTSIDE_REQUIRED\","
                + "\"unassigned_reason_text\":\"Review legacy row\"");
        assertEquals("UNASSIGNED", cleaned.path("coverage_status").asText());
        assertEquals(revision + 1, cleaned.path("revision_no").asLong());
    }

    private long createPlanForRoundTwo() throws Exception {
        String body = "{\"plan_code\":\"ROUND_TWO_MUTATION_TEST\",\"created_by\":1,"
            + "\"optimization_config_id\":1,\"rule_set_version_id\":1,"
            + "\"source_revision_token\":\"" + token(2) + "\"}";
        JsonNode response = json.readTree(mvc.perform(post("/api/assignment-rounds/2/plan")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        return response.path("current_version").path("id").asLong();
    }

    private JsonNode change(long versionId, long demandId, long revision, String token,
            String assignmentFields) throws Exception {
        return json.readTree(mvc.perform(patch("/api/plan-versions/{id}/assignments/{demand_id}",
                versionId, demandId).contentType(MediaType.APPLICATION_JSON)
                .content(body(revision, token, assignmentFields)))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private static String body(long revision, String token, String fields) {
        return "{\"expected_revision_no\":" + revision + ",\"source_revision_token\":\""
            + token + "\"," + fields + "}";
    }

    private long revision(long versionId) {
        return jdbc.queryForObject("SELECT revision_no FROM plan_version WHERE id=?", Long.class, versionId);
    }

    private String token(long roundId) {
        return jdbc.queryForObject("SELECT source_revision_token FROM assignment_round WHERE id=?",
            String.class, roundId);
    }

    private int auditCount() {
        return jdbc.queryForObject("SELECT count(*) FROM audit_log", Integer.class);
    }
}
