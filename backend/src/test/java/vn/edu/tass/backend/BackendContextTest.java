package vn.edu.tass.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RestController;

import vn.edu.tass.backend.payload.request.SchoolRequest;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class BackendContextTest {
    @Autowired ApplicationContext context;
    @Autowired ObjectMapper json;

    @Test
    void registersSixteenControllersServicesAndRepositories() {
        assertEquals(16, context.getBeansWithAnnotation(RestController.class).size());
        assertEquals(16, context.getBeansWithAnnotation(Service.class).size());
        assertEquals(16, context.getBeansWithAnnotation(Repository.class).size());
    }

    @Test
    void rejectsUnknownRequestFields() {
        assertThrows(com.fasterxml.jackson.core.JsonProcessingException.class,
            () -> json.readValue("{\"unknown\":1}", SchoolRequest.class));
    }
}
