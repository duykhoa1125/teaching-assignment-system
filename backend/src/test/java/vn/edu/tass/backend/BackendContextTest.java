package vn.edu.tass.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.tass.backend.payload.request.SchoolRequest;
import vn.edu.tass.backend.service.SchoolService;
import vn.edu.tass.backend.exception.NotFoundException;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE, properties = {
    "spring.datasource.url=jdbc:h2:mem:tass_context;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class BackendContextTest {
    @Autowired ApplicationContext context;
    @Autowired ObjectMapper json;
    @Autowired SchoolService schools;

    @Test
    void registersTwentyControllersServicesAndRepositories() {
        assertEquals(20, context.getBeansWithAnnotation(RestController.class).size());
        assertEquals(20, context.getBeansWithAnnotation(Service.class).size());
        assertEquals(20, context.getBeanNamesForType(org.springframework.data.jpa.repository.JpaRepository.class).length);
    }

    @Test
    void rejectsUnknownRequestFields() {
        assertThrows(com.fasterxml.jackson.core.JsonProcessingException.class,
            () -> json.readValue("{\"unknown\":1}", SchoolRequest.class));
    }

    @Test
    @Transactional
    void jpaPersistsAndUpdatesSchool() {
        SchoolRequest request = new SchoolRequest();
        request.setSchoolCode("TEST_JPA");
        request.setName("First name");
        request.setStatus("ACTIVE");
        var created = schools.createSchool(request);
        long id = created.getId();
        assertEquals("First name", schools.retrieveById(id).getName());
        assertTrue(schools.retrieveAllSchool(20, 0).stream().anyMatch(row -> row.getId() == id));
        request.setSchoolCode("TEST_JPA_2");
        long secondId = schools.createSchool(request).getId();
        assertEquals(secondId, schools.retrieveAllSchool(1, 1).get(0).getId());
        request.setSchoolCode("TEST_JPA");
        request.setName("Updated name");
        assertEquals("Updated name", schools.updateSchool(id, request).getName());
        schools.deleteSchool(id);
        assertThrows(NotFoundException.class, () -> schools.retrieveById(id));
    }
}
