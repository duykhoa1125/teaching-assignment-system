package vn.edu.tass.backend.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.springframework.stereotype.Component;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import vn.edu.tass.backend.exception.ApiExceptionHandler;

class PerEntityCrudTest {
    private static final ObjectMapper JSON = new ObjectMapper().findAndRegisterModules();

    @ParameterizedTest(name = "{0}")
    @MethodSource("resources")
    @SuppressWarnings({"rawtypes", "unchecked"})
    void seventeenResourcesUseJpaAndExposeCrud(String name, String path, String table) throws Exception {
        Class<?> entityType = type("entity", name);
        Class<?> requestType = type("payload.request", name + "Request");
        Class<?> dtoType = type("payload.dto", name + "Dto");
        Class<?> repositoryType = type("repository", name + "Repository");
        Class<?> mapperType = type("mapper", name + "Mapper");
        Class<?> serviceType = type("service", name + "Service");
        Class<?> serviceImplType = type("service.impl", name + "ServiceImpl");
        Class<?> controllerType = type("controller", name + "Controller");
        assertTrue(entityType.isAnnotationPresent(Entity.class));
        assertEquals(table, entityType.getAnnotation(Table.class).name());
        assertTrue(JpaRepository.class.isAssignableFrom(repositoryType));
        assertTrue(mapperType.isAnnotationPresent(Component.class));
        assertTrue(serviceType.isInterface() && serviceType.isAssignableFrom(serviceImplType));
        assertFalse(requestType.isRecord());
        assertFalse(dtoType.isRecord());

        Object entity = entityType.getConstructor().newInstance();
        for (Field field : entityType.getDeclaredFields()) {
            field.setAccessible(true);
            field.set(entity, sample(field.getType()));
        }
        JpaRepository repository = (JpaRepository) mock(repositoryType);
        when(repository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(entity)));
        when(repository.findById(1L)).thenReturn(Optional.of(entity));
        doAnswer(invocation -> {
            Object saved = invocation.getArgument(0);
            Field id = entityType.getDeclaredField("id");
            id.setAccessible(true);
            id.set(saved, 1L);
            return saved;
        }).when(repository).saveAndFlush(any());
        Object mapper = mapperType.getConstructor().newInstance();
        Object service = name.equals("AssignmentRound")
            ? serviceImplType.getConstructor(repositoryType, mapperType, EntityManager.class)
                .newInstance(repository, mapper, mock(EntityManager.class))
            : serviceImplType.getConstructor(repositoryType, mapperType)
                .newInstance(repository, mapper);
        Object controller = controllerType.getConstructor(serviceType).newInstance(service);
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        MockMvc mvc = MockMvcBuilders.standaloneSetup(controller)
            .setControllerAdvice(new ApiExceptionHandler()).setValidator(validator)
            .setMessageConverters(new MappingJackson2HttpMessageConverter(JSON)).build();

        Map<String, Object> request = requestBody(requestType);
        String url = "/api/" + path;
        String body = JSON.writeValueAsString(request);
        String firstField = request.keySet().iterator().next();
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
        verify(repository).delete(entity);

        Object readDto = serviceType.getMethod("retrieveById", long.class).invoke(service, 1L);
        assertSameFields(entity, readDto);
        Object changedRequest = requestType.getConstructor().newInstance();
        for (Field field : requestType.getDeclaredFields()) {
            field.setAccessible(true);
            field.set(changedRequest, requestSample(field, true));
        }
        Object createdDto = serviceType.getMethod("create" + name, requestType)
            .invoke(service, changedRequest);
        assertSameFields(changedRequest, createdDto);
        assertEquals(1L, dtoType.getMethod("getId").invoke(createdDto));
        Object updatedDto = serviceType.getMethod("update" + name, long.class, requestType)
            .invoke(service, 1L, changedRequest);
        assertSameFields(changedRequest, updatedDto);
        assertEquals(1L, dtoType.getMethod("getId").invoke(updatedDto));
        validator.destroy();
    }

    private static Class<?> type(String layer, String name) throws ClassNotFoundException {
        return Class.forName("vn.edu.tass.backend." + layer + "." + name);
    }

    private static Map<String, Object> requestBody(Class<?> type) {
        Map<String, Object> body = new LinkedHashMap<>();
        for (Field field : type.getDeclaredFields()) {
            Object value = requestSample(field, false);
            body.put(field.getName().replaceAll("([A-Z])", "_$1").toLowerCase(),
                value instanceof LocalDate || value instanceof OffsetDateTime ? value.toString() : value);
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

    private static Object changedSample(Class<?> type) {
        if (type == Long.class) return 2L;
        if (type == Integer.class) return 2;
        if (type == BigDecimal.class) return new BigDecimal("3.75");
        if (type == LocalDate.class) return LocalDate.of(2027, 1, 1);
        if (type == OffsetDateTime.class) return OffsetDateTime.parse("2027-01-01T10:00:00+07:00");
        assertEquals(String.class, type);
        return "UPDATED";
    }

    private static Object requestSample(Field field, boolean changed) {
        return switch (field.getName()) {
            case "demandType" -> changed ? "ENRICHMENT" : "STANDARD";
            case "unit" -> "PERIOD_PER_WEEK";
            case "experienceStatus" -> "HAS_EXPERIENCE";
            case "status" -> field.getDeclaringClass().getSimpleName().equals("ClassSubjectApplicabilityRequest")
                ? (changed ? "NOT_APPLICABLE" : "APPLICABLE")
                : (changed ? "UPDATED" : "ACTIVE");
            default -> changed ? changedSample(field.getType()) : sample(field.getType());
        };
    }

    private static void assertSameFields(Object expected, Object actual) throws Exception {
        for (Field source : expected.getClass().getDeclaredFields()) {
            source.setAccessible(true);
            Field destination = actual.getClass().getDeclaredField(source.getName());
            destination.setAccessible(true);
            assertEquals(source.get(expected), destination.get(actual), source.getName());
        }
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
            Arguments.of("ClassSubjectApplicability", "class-subject-applicabilities", "class_subject_applicability"),
            Arguments.of("RequiredDemandComponent", "required-demand-components", "required_demand_component")
        );
    }
}
