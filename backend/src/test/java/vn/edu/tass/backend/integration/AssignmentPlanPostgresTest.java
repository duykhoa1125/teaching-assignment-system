package vn.edu.tass.backend.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

/** Uses the seeded PostgreSQL schema; every test rolls back its writes. */
@EnabledIfSystemProperty(named = "db.integration", matches = "true")
@SpringBootTest
@AutoConfigureMockMvc
class AssignmentPlanPostgresTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    @Test
    @Transactional
    void retrievesExistingCurrentVersionAndDoesNotCreateAnotherPlan() throws Exception {
        JsonNode plan = readPlan(1);
        assertEquals(1, plan.path("id").asLong());
        assertEquals(1, plan.path("round_id").asLong());
        assertEquals(2, plan.path("current_version").path("version_no").asInt());
        assertEquals("DRAFT", plan.path("current_version").path("status").asText());
        assertTrue(plan.path("current_version").path("revision_no").asLong() >= 0);
        assertEquals(1, plan.path("current_version").path("optimization_config_id").asLong());

        long snapshotsBefore = count("input_snapshot");
        mvc.perform(post("/api/assignment-rounds/1/plan")
                .contentType(MediaType.APPLICATION_JSON).content(body("OTHER_CODE", token(1), 1, 1, 1)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("PLAN_ALREADY_EXISTS"));
        assertEquals(snapshotsBefore, count("input_snapshot"));
    }

    @Test
    @Transactional
    void createsOneDraftAndServerOwnedSnapshotForPreparingRound() throws Exception {
        mvc.perform(get("/api/assignment-rounds/2/plan")).andExpect(status().isNotFound());
        String expectedToken = token(2);
        JsonNode result = json.readTree(mvc.perform(post("/api/assignment-rounds/2/plan")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body("ROUND_2_PLAN", expectedToken, 1, 1, 1)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.current_version.status").value("DRAFT"))
            .andExpect(jsonPath("$.current_version.revision_no").value(0))
            .andReturn().getResponse().getContentAsString());
        assertEquals(2, result.path("round_id").asLong());
        assertEquals(1, result.path("current_version").path("version_no").asInt());
        assertEquals(expectedToken, result.path("current_version").path("source_revision_token").asText());
        assertEquals(result, readPlan(2));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM assignment_plan WHERE round_id=2", Integer.class));
        long snapshotId = result.path("current_version").path("input_snapshot_id").asLong();
        assertEquals(2, jdbc.queryForObject("SELECT round_id FROM input_snapshot WHERE id=?", Integer.class, snapshotId));
        assertTrue(jdbc.queryForObject("SELECT payload_json->>'demo_only' FROM input_snapshot WHERE id=?",
            String.class, snapshotId).equals("true"));
    }

    @Test
    @Transactional
    void rejectsStaleTokenAndInvalidSelectionsWithoutWrites() throws Exception {
        long before = count("input_snapshot");
        mvc.perform(post("/api/assignment-rounds/2/plan")
                .contentType(MediaType.APPLICATION_JSON).content(body("STALE", "old-token", 1, 1, 1)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("STALE_SOURCE_REVISION"));
        mvc.perform(post("/api/assignment-rounds/2/plan")
                .contentType(MediaType.APPLICATION_JSON).content(body("INVALID_ACTOR", token(2), 999999, 1, 1)))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/api/assignment-rounds/2/plan")
                .contentType(MediaType.APPLICATION_JSON).content(body("INVALID_CONFIG", token(2), 1, 999999, 1)))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/api/assignment-rounds/2/plan")
                .contentType(MediaType.APPLICATION_JSON).content(body("INVALID_RULE", token(2), 1, 1, 999999)))
            .andExpect(status().isBadRequest());
        assertEquals(before, count("input_snapshot"));
        mvc.perform(get("/api/assignment-rounds/2/plan")).andExpect(status().isNotFound());
    }

    @Test
    @Transactional
    void sourceMutationInvalidatesEarlierReadinessToken() throws Exception {
        String oldToken = token(2);
        jdbc.update("UPDATE assignment_round SET round_code = ? WHERE id = 2", "DEMO_PREPARATION_CHANGED");
        assertNotEquals(oldToken, token(2));
        mvc.perform(post("/api/assignment-rounds/2/plan")
                .contentType(MediaType.APPLICATION_JSON).content(body("OLD_TOKEN", oldToken, 1, 1, 1)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("STALE_SOURCE_REVISION"));
    }

    @Test
    void duplicatePlanCodeRollsBackTheCapturedSnapshot() throws Exception {
        long before = count("input_snapshot");
        mvc.perform(post("/api/assignment-rounds/2/plan")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body("DEMO_PLAN_HK1", token(2), 1, 1, 1)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("DUPLICATE_RESOURCE"));
        assertEquals(before, count("input_snapshot"));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM assignment_plan WHERE round_id=2", Integer.class));
    }

    private JsonNode readPlan(long roundId) throws Exception {
        return json.readTree(mvc.perform(get("/api/assignment-rounds/" + roundId + "/plan"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private String token(long roundId) {
        return jdbc.queryForObject("SELECT source_revision_token FROM assignment_round WHERE id=?",
            String.class, roundId);
    }

    private long count(String table) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table, Long.class);
    }

    private static String body(String code, String token, long actor, long config, long rules) {
        return "{\"plan_code\":\"" + code + "\",\"source_revision_token\":\"" + token
            + "\",\"created_by\":" + actor + ",\"optimization_config_id\":" + config
            + ",\"rule_set_version_id\":" + rules + "}";
    }
}
