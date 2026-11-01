package vn.edu.tass.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.lang.reflect.RecordComponent;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import vn.edu.tass.backend.entity.SqlColumn;
import vn.edu.tass.backend.exception.ApiExceptionHandler;
import vn.edu.tass.backend.repository.support.EntityMetadata;

class PerEntityCrudTest {
    private static final ObjectMapper JSON = new ObjectMapper();

    @ParameterizedTest(name = "{0}")
    @MethodSource("resources")
    void eachEntityHasOwnLayersAndAllCrudRoutes(String name, String path, String table) throws Exception {
        Class<?> entityType = type("entity", name);
        Class<?> requestType = type("payload.request", name + "Request");
        Class<?> dtoType = type("payload.dto", name + "Dto");
        Class<?> repositoryType = type("repository", name + "Repository");
        Class<?> serviceType = type("service", name + "Service");
        Class<?> serviceImplType = type("service.impl", name + "ServiceImpl");
        Class<?> controllerType = type("controller", name + "Controller");
        assertTrue(entityType.isRecord());
        assertTrue(requestType.isRecord());
        assertTrue(dtoType.isRecord());

        Object entity = exampleEntity(entityType);
        NamedParameterJdbcTemplate jdbc = mock(NamedParameterJdbcTemplate.class);
        doAnswer(invocation -> List.of(entity)).when(jdbc)
            .query(anyString(), any(MapSqlParameterSource.class), any(RowMapper.class));
        when(jdbc.update(anyString(), any(MapSqlParameterSource.class))).thenReturn(1);
        Object repository = repositoryType.getConstructor(NamedParameterJdbcTemplate.class).newInstance(jdbc);
        assertTrue(serviceType.isInterface());
        assertTrue(serviceType.isAssignableFrom(serviceImplType));
        Object service = serviceImplType.getConstructor(repositoryType).newInstance(repository);
        Object controller = controllerType.getConstructor(serviceType).newInstance(service);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(controller)
            .setControllerAdvice(new ApiExceptionHandler()).build();

        String url = "/api/" + path;
        String body = JSON.writeValueAsString(requestBody(entityType));
        String firstField = requestBody(entityType).keySet().iterator().next();
        mvc.perform(get(url)).andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(1));
        mvc.perform(get(url + "/1")).andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1)).andExpect(jsonPath("$." + firstField).exists());
        mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(1));
        mvc.perform(put(url + "/1").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(1));
        mvc.perform(delete(url + "/1")).andExpect(status().isNoContent());
        mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest());
        mvc.perform(get(url + "/0")).andExpect(status().isBadRequest());

        ArgumentCaptor<String> queries = ArgumentCaptor.forClass(String.class);
        verify(jdbc, times(4)).query(queries.capture(), any(MapSqlParameterSource.class), any(RowMapper.class));
        assertTrue(queries.getAllValues().get(0).startsWith("SELECT * FROM " + table + " ORDER BY id"));
        assertTrue(queries.getAllValues().get(1).startsWith("SELECT * FROM " + table + " WHERE id"));
        assertTrue(queries.getAllValues().get(2).startsWith("INSERT INTO " + table + " ("));
        assertTrue(queries.getAllValues().get(3).startsWith("UPDATE " + table + " SET "));
        verify(jdbc).update(org.mockito.ArgumentMatchers.eq("DELETE FROM " + table + " WHERE id = :id"),
            any(MapSqlParameterSource.class));
    }

    private static Class<?> type(String layer, String name) throws ClassNotFoundException {
        return Class.forName("vn.edu.tass.backend." + layer + "." + name);
    }

    private static Object exampleEntity(Class<?> type) throws Exception {
        RecordComponent[] fields = type.getRecordComponents();
        Class<?>[] types = Stream.of(fields).map(RecordComponent::getType).toArray(Class<?>[]::new);
        Object[] values = Stream.of(fields).map(field -> sample(field.getType())).toArray();
        return type.getConstructor(types).newInstance(values);
    }

    private static Map<String, Object> requestBody(Class<?> type) {
        Map<String, Object> body = new LinkedHashMap<>();
        for (RecordComponent field : type.getRecordComponents()) {
            if (!field.getAnnotation(SqlColumn.class).writable()) continue;
            Object value = sample(field.getType());
            if (value instanceof LocalDate || value instanceof OffsetDateTime) value = value.toString();
            body.put(EntityMetadata.sqlName(field.getName()), value);
        }
        return body;
    }

    private static Object sample(Class<?> type) {
        if (type == Long.class) return 1L;
        if (type == Integer.class) return 1;
        if (type == BigDecimal.class) return new BigDecimal("2.50");
        if (type == LocalDate.class) return LocalDate.of(2026, 9, 1);
        if (type == OffsetDateTime.class) return OffsetDateTime.parse("2026-11-01T09:00:00+07:00");
        assertEquals(String.class, type);
        return "ACTIVE";
    }

    private static Stream<Arguments> resources() {
        return Stream.of(
            Arguments.of("School", "schools", "school"),
            Arguments.of("AcademicYear", "academic-years", "academic_year"),
            Arguments.of("Semester", "semesters", "semester"),
            Arguments.of("EducationLevel", "education-levels", "education_level"),
            Arguments.of("Grade", "grades", "grade"),
            Arguments.of("SchoolClass", "classes", "school_class"),
            Arguments.of("Subject", "subjects", "subject"),
            Arguments.of("Teacher", "teachers", "teacher"),
            Arguments.of("TeachingDemand", "teaching-demands", "teaching_demand"),
            Arguments.of("Department", "departments", "department"),
            Arguments.of("TeacherEmployment", "teacher-employments", "teacher_employment"),
            Arguments.of("TeachingQualification", "teaching-qualifications", "teaching_qualification"),
            Arguments.of("TeachingExperience", "teaching-experiences", "teaching_experience"),
            Arguments.of("AssignmentRound", "assignment-rounds", "assignment_round"),
            Arguments.of("RoundSubjectScope", "round-subject-scopes", "round_subject_scope"),
            Arguments.of("ClassSubjectApplicability", "class-subject-applicabilities", "class_subject_applicability")
        );
    }
}
