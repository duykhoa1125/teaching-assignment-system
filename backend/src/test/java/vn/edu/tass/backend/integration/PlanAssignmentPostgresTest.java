package vn.edu.tass.backend.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
class PlanAssignmentPostgresTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    @Test
    @Transactional
    void currentAndHistoricalVersionsKeepSeparateTeachersAndLocks() throws Exception {
        JsonNode current = assignments(2);
        assertEquals(10, current.size());
        JsonNode standard = demand(current, 1);
        JsonNode topic = demand(current, 2);
        assertEquals("STANDARD", standard.path("demand_type").asText());
        assertEquals("SPECIALIZED_TOPIC", topic.path("demand_type").asText());
        assertEquals(1, standard.path("teacher_id").asLong());
        assertEquals(3, topic.path("teacher_id").asLong());
        assertTrue(standard.path("is_locked").asBoolean());
        assertEquals("ASSIGNED", standard.path("coverage_status").asText());
        assertEquals(2, standard.path("periods_per_week").asInt());
        assertEquals("PERIOD_PER_WEEK", standard.path("unit").asText());
        assertTrue(standard.path("valid_from").isTextual());
        assertTrue(standard.path("valid_to").isTextual());
        assertTrue(standard.path("class_code").isTextual());
        assertTrue(standard.path("subject_code").isTextual());
        assertEquals("KHTN", demand(current, 8).path("subject_code").asText());
        assertEquals(2, demand(assignments(1), 2).path("teacher_id").asLong());
    }

    @Test
    @Transactional
    void filtersByTeacherClassSubjectTypeAndEffectiveDateWithStablePagination() throws Exception {
        JsonNode byTeacher = assignments(2, "teacher_id", "3");
        assertTrue(byTeacher.size() > 0);
        for (JsonNode row : byTeacher) assertEquals(3, row.path("teacher_id").asLong());

        JsonNode byClass = assignments(2, "class_id", "1");
        assertEquals(4, byClass.size());
        JsonNode combined = assignments(2, "class_id", "1", "subject_id", "1",
            "demand_type", "SPECIALIZED_TOPIC", "as_of", "2026-10-15");
        assertEquals(1, combined.size());
        assertEquals(2, combined.get(0).path("demand_id").asLong());
        assertEquals(3, combined.get(0).path("teacher_id").asLong());
        assertEquals(3, assignments(2, "class_id", "1", "as_of", "2026-10-15").size());
        assertEquals(4, assignments(2, "class_id", "1", "as_of", "2026-11-15").size());
        assertEquals(5, demand(assignments(2, "as_of", "2026-10-31"), 5)
            .path("periods_per_week").asInt());
        assertEquals(6, demand(assignments(2, "as_of", "2026-11-01"), 6)
            .path("demand_id").asInt());

        JsonNode first = assignments(2, "limit", "2", "offset", "0");
        JsonNode second = assignments(2, "limit", "2", "offset", "2");
        assertEquals(2, first.size());
        assertEquals(2, second.size());
        assertEquals(assignments(2).get(0), first.get(0));
        assertEquals(assignments(2).get(2), second.get(0));
    }

    @Test
    @Transactional
    void newDraftDistinguishesMissingDemandFromMissingPlanRowAndSavedUnassignedReason() throws Exception {
        long versionId = createPlanForRoundTwo();
        JsonNode rows = assignments(versionId);
        assertEquals(4, rows.size());
        JsonNode missingDemand = component(rows, 12);
        assertEquals("MISSING_DEMAND", missingDemand.path("coverage_status").asText());
        assertTrue(missingDemand.path("demand_id").isNull());
        assertTrue(missingDemand.path("periods_per_week").isNull());
        assertTrue(missingDemand.path("unassigned_reason_code").isNull());
        JsonNode missingPlanRow = component(rows, 11);
        assertEquals("MISSING_PLAN_ROW", missingPlanRow.path("coverage_status").asText());
        assertTrue(missingPlanRow.path("is_locked").isNull());
        assertTrue(missingPlanRow.path("unassigned_reason_code").isNull());

        jdbc.update("""
            INSERT INTO plan_demand(plan_version_id,demand_id,periods_per_week_snapshot,
                teacher_id,unassigned_reason_code,unassigned_reason_text)
            VALUES(?,4,4,NULL,'PENDING_REVIEW','Chưa chọn giáo viên')
            """, versionId);
        JsonNode unassigned = component(assignments(versionId), 11);
        assertEquals("UNASSIGNED", unassigned.path("coverage_status").asText());
        assertEquals("PENDING_REVIEW", unassigned.path("unassigned_reason_code").asText());
        assertEquals("Chưa chọn giáo viên", unassigned.path("unassigned_reason_text").asText());
        assertFalse(unassigned.path("is_locked").asBoolean());
        assertTrue(assignments(versionId, "teacher_id", "1").isEmpty());

        jdbc.update("""
            INSERT INTO plan_demand(plan_version_id,demand_id,periods_per_week_snapshot,
                teacher_id,unassigned_reason_code,unassigned_reason_text)
            VALUES(?,7,0.5,NULL,'UNLINKED_REQUIRED_SET','Nhu cầu chưa liên kết tập bắt buộc')
            """, versionId);
        JsonNode outsideRequiredSet = demand(assignments(versionId), 7);
        assertTrue(outsideRequiredSet.path("required_component_id").isNull());
        assertEquals("UNASSIGNED", outsideRequiredSet.path("coverage_status").asText());
        assertEquals("UNLINKED_REQUIRED_SET", outsideRequiredSet.path("unassigned_reason_code").asText());
    }

    @Test
    @Transactional
    void historicalViewUsesSnapshotEvenAfterLiveSourceChanges() throws Exception {
        JsonNode before = demand(assignments(1), 1);
        jdbc.update("UPDATE teaching_demand SET periods_per_week=2.5 WHERE id=1");
        jdbc.update("UPDATE school_class SET class_code='10A1_CHANGED' WHERE id=1");
        jdbc.update("UPDATE teacher SET full_name='Changed live name' WHERE id=1");
        assertEquals(before, demand(assignments(1), 1));
    }

    @Test
    void missingVersionReturnsNotFound() throws Exception {
        mvc.perform(get("/api/plan-versions/999999/assignments")).andExpect(status().isNotFound());
    }

    private long createPlanForRoundTwo() throws Exception {
        String token = jdbc.queryForObject(
            "SELECT source_revision_token FROM assignment_round WHERE id=2", String.class);
        String body = "{\"plan_code\":\"ROUND_TWO_VIEW_TEST\",\"created_by\":1,"
            + "\"optimization_config_id\":1,\"rule_set_version_id\":1,"
            + "\"source_revision_token\":\"" + token + "\"}";
        JsonNode result = json.readTree(mvc.perform(post("/api/assignment-rounds/2/plan")
            .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        long versionId = result.path("current_version").path("id").asLong();
        assertTrue(versionId > 0);
        return versionId;
    }

    private JsonNode assignments(long versionId, String... params) throws Exception {
        var request = get("/api/plan-versions/" + versionId + "/assignments");
        for (int i = 0; i < params.length; i += 2) request.param(params[i], params[i + 1]);
        JsonNode rows = json.readTree(mvc.perform(request).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString());
        assertTrue(rows.isArray());
        return rows;
    }

    private static JsonNode demand(JsonNode rows, long id) {
        for (JsonNode row : rows) if (row.path("demand_id").asLong() == id) return row;
        throw new AssertionError("Missing demand " + id);
    }

    private static JsonNode component(JsonNode rows, long id) {
        for (JsonNode row : rows) if (row.path("required_component_id").asLong() == id) return row;
        throw new AssertionError("Missing required component " + id);
    }
}
