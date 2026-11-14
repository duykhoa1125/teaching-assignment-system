package vn.edu.tass.backend.integration;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import java.nio.file.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.tass.solver.Json;
import vn.edu.tass.testing.*;

@EnabledIfSystemProperty(named="solver.replay.checkpoint",matches=".+")
@SpringBootTest(classes={PlanApiTestConfiguration.class,PlanResultReadTestConfiguration.class})
@AutoConfigureMockMvc
class PlanResultRestartPostgresTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry p) { AssignmentPlanPostgresTest.database(p); }
    @Autowired MockMvc mvc;
    @Test void readsSameAssignmentsWorkloadsOptimizationAndValidationInFreshJvm() throws Exception {
        var checkpoint=Json.MAPPER.readTree(Files.readString(Path.of(System.getProperty("solver.replay.checkpoint"))));
        long version=checkpoint.path("version_id").asLong(); String login=checkpoint.path("login_name").asText();
        for(String suffix:List.of("assignments","workloads","optimization","validation")) {
            var body=mvc.perform(get("/api/plan-versions/"+version+"/"+suffix).principal(()->login)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            assertEquals(checkpoint.path(suffix),Json.MAPPER.readTree(body),suffix+" differs after restart");
        }
    }
}
