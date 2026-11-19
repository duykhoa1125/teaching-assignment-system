package vn.edu.tass.backend.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:tass_teacher_profile;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureMockMvc
@Transactional
class TeacherProfileApiTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void aggregatesSixGroupsForSemesterAndUsesLatestExperiencePerSubjectGrade() throws Exception {
        long school = create("schools", """
            {"school_code":"PROFILE-S1","name":"School 1","status":"ACTIVE"}
            """);
        long year = create("academic-years", """
            {"school_id":%d,"year_code":"2026-2027","starts_on":"2026-08-01","ends_on":"2027-07-31"}
            """.formatted(school));
        long semester = create("semesters", """
            {"academic_year_id":%d,"semester_no":1,"starts_on":"2026-08-01","ends_on":"2026-12-31"}
            """.formatted(year));
        long previousYear = create("academic-years", """
            {"school_id":%d,"year_code":"2025-2026","starts_on":"2025-08-01","ends_on":"2026-07-31"}
            """.formatted(school));
        long previousSemester = create("semesters", """
            {"academic_year_id":%d,"semester_no":2,"starts_on":"2026-01-01","ends_on":"2026-05-31"}
            """.formatted(previousYear));
        long nextSemester = create("semesters", """
            {"academic_year_id":%d,"semester_no":2,"starts_on":"2027-01-01","ends_on":"2027-05-31"}
            """.formatted(year));
        long teacher = create("teachers", """
            {"school_id":%d,"teacher_code":"GV-P1","full_name":"Nguyen A"}
            """.formatted(school));
        long otherTeacher = create("teachers", """
            {"school_id":%d,"teacher_code":"GV-P2","full_name":"Nguyen B"}
            """.formatted(school));

        long employment = create("teacher-employments", """
            {"teacher_id":%d,"department_id":1,"semester_id":%d,"employment_status":"TEACHING",
            "position_code":"TEACHER","valid_from":"2026-08-01","valid_to":"2026-12-31"}
            """.formatted(teacher, semester));
        long qualification = create("teaching-qualifications", """
            {"teacher_id":%d,"subject_id":1,"education_level_id":1,"verification_status":"VERIFIED",
            "valid_from":"2026-07-01","valid_to":"2026-08-01"}
            """.formatted(teacher));
        create("teaching-qualifications", """
            {"teacher_id":%d,"subject_id":2,"education_level_id":1,"verification_status":"VERIFIED",
            "valid_from":"2026-01-01","valid_to":"2026-07-31"}
            """.formatted(teacher));
        create("teaching-qualifications", """
            {"teacher_id":%d,"subject_id":3,"education_level_id":1,"verification_status":"VERIFIED",
            "valid_from":"2026-08-01"}
            """.formatted(otherTeacher));

        create("teaching-experiences", """
            {"teacher_id":%d,"subject_id":1,"grade_id":1,"experience_status":"UNKNOWN",
            "as_of_date":"2026-08-01","recorded_by":1}
            """.formatted(teacher));
        long latestExperience = create("teaching-experiences", """
            {"teacher_id":%d,"subject_id":1,"grade_id":1,"experience_status":"HAS_EXPERIENCE",
            "years_of_experience":2.5,"as_of_date":"2026-10-01","evidence_ref":"HR-1",
            "verified_by":1,"verified_at":"2026-10-02T09:00:00+07:00","recorded_by":1}
            """.formatted(teacher));
        create("teaching-experiences", """
            {"teacher_id":%d,"subject_id":1,"grade_id":1,"experience_status":"UNKNOWN",
            "as_of_date":"2027-01-01","recorded_by":1}
            """.formatted(teacher));

        long history = create("teaching-histories", """
            {"teacher_id":%d,"academic_year_id":%d,"semester_id":%d,"class_id":1,"subject_id":1,
            "taught_from":"2026-09-01","taught_to":"2026-12-31","source_kind":"EXTERNAL_RECORD",
            "evidence_ref":"HR-1","verification_status":"PENDING","recorded_by":1}
            """.formatted(teacher, year, semester));
        long previousHistory = create("teaching-histories", """
            {"teacher_id":%d,"academic_year_id":%d,"semester_id":%d,"class_id":2,"subject_id":1,
            "taught_from":"2026-01-01","taught_to":"2026-05-31","source_kind":"EXTERNAL_RECORD",
            "evidence_ref":"HR-OLD","verification_status":"VERIFIED","verified_by":1,
            "verified_at":"2026-06-01T09:00:00+07:00","recorded_by":1}
            """.formatted(teacher, previousYear, previousSemester));
        create("teaching-histories", """
            {"teacher_id":%d,"academic_year_id":%d,"semester_id":%d,"class_id":3,"subject_id":1,
            "taught_from":"2027-01-01","taught_to":"2027-05-31","source_kind":"EXTERNAL_RECORD",
            "evidence_ref":"HR-FUTURE","verification_status":"PENDING","recorded_by":1}
            """.formatted(teacher, year, nextSemester));
        long basis = create("teacher-workload-bases", """
            {"teacher_id":%d,"semester_id":%d,"education_level_id":1,"position_code":"TEACHER",
            "base_periods_per_week":17,"unit":"PERIOD_PER_WEEK","valid_from":"2026-08-01",
            "valid_to":"2026-12-31","profile_ref":"PROFILE-1","verification_status":"PENDING"}
            """.formatted(teacher, semester));
        long duty = create("teacher-duties", """
            {"teacher_id":%d,"semester_id":%d,"rule_definition_id":1,"duty_type":"HOMEROOM",
            "class_id":1,"scope_description":"10A1","valid_from":"2026-08-01",
            "verification_status":"PENDING","payment_status":"UNPAID"}
            """.formatted(teacher, semester));

        mvc.perform(get("/api/teachers/{id}/profile", teacher).param("semester_id", String.valueOf(semester)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.teacher.id").value(teacher))
            .andExpect(jsonPath("$.semester.id").value(semester))
            .andExpect(jsonPath("$.employments.length()").value(1))
            .andExpect(jsonPath("$.employments[0].id").value(employment))
            .andExpect(jsonPath("$.qualifications.length()").value(1))
            .andExpect(jsonPath("$.qualifications[0].id").value(qualification))
            .andExpect(jsonPath("$.experiences.length()").value(1))
            .andExpect(jsonPath("$.experiences[0].id").value(latestExperience))
            .andExpect(jsonPath("$.experiences[0].years_of_experience").value(2.5))
            .andExpect(jsonPath("$.teaching_histories.length()").value(2))
            .andExpect(jsonPath("$.teaching_histories[0].id").value(history))
            .andExpect(jsonPath("$.teaching_histories[1].id").value(previousHistory))
            .andExpect(jsonPath("$.workload_bases[0].id").value(basis))
            .andExpect(jsonPath("$.duties[0].id").value(duty));
    }

    @Test
    void validatesTeacherSemesterAndReturnsEmptyGroupsWhenNoRelatedDataExists() throws Exception {
        long school = create("schools", """
            {"school_code":"PROFILE-S2","name":"School 2","status":"ACTIVE"}
            """);
        long otherSchool = create("schools", """
            {"school_code":"PROFILE-S3","name":"School 3","status":"ACTIVE"}
            """);
        long year = create("academic-years", """
            {"school_id":%d,"year_code":"2026-2027","starts_on":"2026-08-01","ends_on":"2027-07-31"}
            """.formatted(school));
        long otherYear = create("academic-years", """
            {"school_id":%d,"year_code":"2026-2027","starts_on":"2026-08-01","ends_on":"2027-07-31"}
            """.formatted(otherSchool));
        long semester = create("semesters", """
            {"academic_year_id":%d,"semester_no":1,"starts_on":"2026-08-01","ends_on":"2026-12-31"}
            """.formatted(year));
        long otherSemester = create("semesters", """
            {"academic_year_id":%d,"semester_no":1,"starts_on":"2026-08-01","ends_on":"2026-12-31"}
            """.formatted(otherYear));
        long teacher = create("teachers", """
            {"school_id":%d,"teacher_code":"GV-P3","full_name":"Nguyen C"}
            """.formatted(school));

        mvc.perform(get("/api/teachers/{id}/profile", teacher).param("semester_id", String.valueOf(semester)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.employments.length()").value(0))
            .andExpect(jsonPath("$.qualifications.length()").value(0))
            .andExpect(jsonPath("$.experiences.length()").value(0))
            .andExpect(jsonPath("$.teaching_histories.length()").value(0))
            .andExpect(jsonPath("$.workload_bases.length()").value(0))
            .andExpect(jsonPath("$.duties.length()").value(0));
        mvc.perform(get("/api/teachers/{id}/profile", teacher))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("Bad Request"));
        mvc.perform(get("/api/teachers/{id}/profile", teacher).param("semester_id", "0"))
            .andExpect(status().isBadRequest());
        mvc.perform(get("/api/teachers/{id}/profile", teacher).param("semester_id", String.valueOf(otherSemester)))
            .andExpect(status().isBadRequest());
        mvc.perform(get("/api/teachers/{id}/profile", 999999).param("semester_id", String.valueOf(semester)))
            .andExpect(status().isNotFound());
        mvc.perform(get("/api/teachers/{id}/profile", teacher).param("semester_id", "999999"))
            .andExpect(status().isNotFound());
    }

    private long create(String resource, String body) throws Exception {
        String response = mvc.perform(post("/api/" + resource)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).path("id").asLong();
    }
}
