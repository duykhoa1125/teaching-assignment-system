package vn.edu.tass.backend.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:tass_input_api;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureMockMvc
@Transactional
class InputDataApiTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void publishesSwaggerAndCompleteCrudContract() throws Exception {
        String response = mvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode spec = json.readTree(response);
        assertEquals("TASS Backend API", spec.path("info").path("title").asText());
        assertEquals(40, spec.path("paths").size());
        for (String resource : new String[]{
                "schools", "academic-years", "semesters", "education-levels", "grades",
                "classes", "subjects", "teachers", "teaching-demands", "departments",
                "teacher-employments", "teaching-qualifications", "teaching-experiences",
                "assignment-rounds", "round-subject-scopes", "class-subject-applicabilities",
                "required-demand-components", "teacher-workload-bases", "teaching-histories",
                "teacher-duties"}) {
            JsonNode collection = spec.path("paths").path("/api/" + resource);
            JsonNode item = spec.path("paths").path("/api/" + resource + "/{id}");
            assertTrue(collection.has("get") && collection.has("post"), resource);
            assertTrue(item.has("get") && item.has("put") && item.has("delete"), resource);
            assertTrue(collection.path("post").path("responses").has("201"), resource);
            assertTrue(item.path("delete").path("responses").has("204"), resource);
            assertTrue(item.path("get").path("responses").has("404"), resource);
            assertTrue(collection.path("post").path("requestBody").path("content")
                .path("application/json").path("example").isObject(), resource);
        }
        assertEquals("GV_NEW", spec.path("paths").path("/api/teachers").path("post")
            .path("requestBody").path("content").path("application/json")
            .path("example").path("teacher_code").asText());
        assertTrue(spec.path("components").path("schemas").path("TeacherRequest")
            .path("properties").has("school_id"));
        assertEquals("STANDARD", spec.path("components").path("schemas")
            .path("TeachingDemandRequest").path("properties").path("demand_type")
            .path("enum").get(0).asText());
        mvc.perform(get("/swagger-ui.html")).andExpect(status().is3xxRedirection());
        mvc.perform(get("/v3/api-docs.yaml")).andExpect(status().isOk());
    }

    @Test
    void listsFilterAndPageTeachersSubjectsClassesAndDemands() throws Exception {
        long teacher = create("teachers", """
            {"school_id":1,"teacher_code":"GV-A","full_name":"Nguyen An"}
            """);
        create("teachers", """
            {"school_id":2,"teacher_code":"GV-B","full_name":"Tran Binh"}
            """);
        mvc.perform(get("/api/teachers").param("school_id", "1").param("q", "an"))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(teacher))
            .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/teachers").param("school_id", "0"))
            .andExpect(status().isBadRequest());
        mvc.perform(get("/api/teachers").param("limit", "1").param("offset", "1"))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].teacher_code").value("GV-B"));

        long subject = create("subjects", """
            {"subject_code":"MATH","name":"Toan","valid_from":"2026-09-01","valid_to":"2026-12-31"}
            """);
        mvc.perform(get("/api/subjects").param("as_of", "2026-09-01"))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(subject));
        mvc.perform(get("/api/subjects").param("as_of", "2027-01-01"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(post("/api/subjects").contentType(MediaType.APPLICATION_JSON).content("""
            {"subject_code":"BAD","name":"Bad","valid_from":"2026-12-31","valid_to":"2026-09-01"}
            """)).andExpect(status().isBadRequest());

        long classId = create("classes", """
            {"academic_year_id":1,"grade_id":1,"class_code":"10A","status":"ACTIVE"}
            """);
        mvc.perform(get("/api/classes").param("grade_id", "1").param("status", "ACTIVE"))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(classId));

        long demand = create("teaching-demands", """
            {"semester_id":1,"class_id":1,"subject_id":1,"periods_per_week":4.5,
            "status":"ACTIVE","updated_by":1,"demand_type":"STANDARD",
            "valid_from":"2026-09-01","valid_to":"2026-12-31","unit":"PERIOD_PER_WEEK"}
            """);
        mvc.perform(get("/api/teaching-demands").param("semester_id", "1")
            .param("demand_type", "STANDARD").param("as_of", "2026-12-31"))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(demand));
        mvc.perform(get("/api/teaching-demands").param("as_of", "2027-01-01"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void maintainsWorkloadBasisHistoryAndDutyWithValidation() throws Exception {
        long basis = create("teacher-workload-bases", """
            {"teacher_id":1,"semester_id":1,"education_level_id":1,"position_code":"TEACHER",
            "base_periods_per_week":19,"unit":"PERIOD_PER_WEEK","valid_from":"2026-09-01",
            "valid_to":"2026-12-31","profile_ref":"HR-1","verification_status":"PENDING"}
            """);
        mvc.perform(get("/api/teacher-workload-bases").param("teacher_id", "1")
            .param("as_of", "2026-12-31"))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(basis));
        mvc.perform(get("/api/teacher-workload-bases").param("as_of", "2027-01-01"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(put("/api/teacher-workload-bases/" + basis)
            .contentType(MediaType.APPLICATION_JSON).content("""
            {"teacher_id":1,"semester_id":1,"education_level_id":1,"position_code":"TEACHER",
            "base_periods_per_week":17,"unit":"PERIOD_PER_WEEK","valid_from":"2026-09-01",
            "valid_to":"2026-12-31","profile_ref":"HR-2","verification_status":"PENDING"}
            """)).andExpect(status().isOk()).andExpect(jsonPath("$.profile_ref").value("HR-2"));
        mvc.perform(post("/api/teacher-workload-bases").contentType(MediaType.APPLICATION_JSON).content("""
            {"teacher_id":1,"semester_id":1,"education_level_id":1,"position_code":"TEACHER",
            "base_periods_per_week":19,"unit":"HOURS","valid_from":"2026-09-01",
            "valid_to":"2026-12-31","profile_ref":"HR","verification_status":"PENDING"}
            """)).andExpect(status().isBadRequest());

        long history = create("teaching-histories", """
            {"teacher_id":1,"academic_year_id":1,"semester_id":1,"class_id":1,
            "subject_id":1,"taught_from":"2026-09-01","taught_to":"2026-12-31",
            "source_kind":"EXTERNAL_RECORD","evidence_ref":"HR-1",
            "verification_status":"PENDING","recorded_by":1}
            """);
        mvc.perform(get("/api/teaching-histories").param("teacher_id", "1")
            .param("as_of", "2026-10-01"))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(history));
        mvc.perform(post("/api/teaching-histories").contentType(MediaType.APPLICATION_JSON).content("""
            {"teacher_id":1,"academic_year_id":1,"semester_id":1,"class_id":1,
            "subject_id":1,"taught_from":"2026-09-01","taught_to":"2026-12-31",
            "source_kind":"EXTERNAL_RECORD","evidence_ref":"HR-1",
            "verification_status":"VERIFIED","recorded_by":1}
            """)).andExpect(status().isBadRequest());

        long duty = create("teacher-duties", """
            {"teacher_id":1,"semester_id":1,"rule_definition_id":1,"duty_type":"HOMEROOM",
            "class_id":1,"scope_description":"10A","valid_from":"2026-09-01",
            "reduction_value":2.5,"verification_status":"PENDING","payment_status":"UNPAID"}
            """);
        mvc.perform(get("/api/teacher-duties").param("teacher_id", "1")
            .param("as_of", "2026-10-01"))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(duty));
        mvc.perform(post("/api/teacher-duties").contentType(MediaType.APPLICATION_JSON).content("""
            {"teacher_id":1,"semester_id":1,"rule_definition_id":1,"duty_type":"HOMEROOM",
            "scope_description":"10A","valid_from":"2026-09-01",
            "verification_status":"PENDING","payment_status":"UNPAID"}
            """)).andExpect(status().isBadRequest());

        for (String path : new String[]{"teacher-workload-bases/" + basis,
                "teaching-histories/" + history, "teacher-duties/" + duty}) {
            mvc.perform(delete("/api/" + path)).andExpect(status().isNoContent());
            mvc.perform(get("/api/" + path)).andExpect(status().isNotFound());
        }
    }

    private long create(String resource, String body) throws Exception {
        String response = mvc.perform(post("/api/" + resource)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        JsonNode node = json.readTree(response);
        return node.get("id").longValue();
    }
}
