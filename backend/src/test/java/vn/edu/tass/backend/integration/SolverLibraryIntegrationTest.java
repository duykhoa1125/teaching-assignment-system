package vn.edu.tass.backend.integration;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration;
import org.springframework.context.ApplicationContext;
import org.springframework.core.io.ClassPathResource;
import vn.edu.tass.solver.AssignmentSolver;
import vn.edu.tass.solver.Cancellation;
import vn.edu.tass.solver.Contract;
import vn.edu.tass.solver.InputValidator;
import vn.edu.tass.solver.Json;
import vn.edu.tass.solver.SolutionValidator;
import vn.edu.tass.backend.config.SolverConfiguration;

@SpringBootTest(classes = {SolverConfiguration.class, JacksonAutoConfiguration.class},
    webEnvironment = SpringBootTest.WebEnvironment.NONE)
class SolverLibraryIntegrationTest {
    @Autowired AssignmentSolver solver;
    @Autowired InputValidator inputValidator;
    @Autowired SolutionValidator solutionValidator;
    @Autowired ObjectMapper httpJson;
    @Autowired ApplicationContext context;

    private Contract.Snapshot fixture() throws Exception {
        try (var input = new ClassPathResource("solver-fixtures/report-five-stage.json").getInputStream()) {
            return Json.MAPPER.readValue(input, Contract.Snapshot.class);
        }
    }

    @Test
    void springBeanSolvesFiveStagesAndPassesIndependentValidation() throws Exception {
        var snapshot = fixture();
        inputValidator.validate(snapshot);
        assertSame(solver, context.getBean(AssignmentSolver.class));

        var result = solver.solve(snapshot, new Cancellation());

        assertEquals("OPTIMAL", result.status(), () -> result.errors().toString());
        assertEquals(snapshot.identity(), result.identity());
        assertEquals(Json.hash(snapshot), result.snapshotHash());
        assertEquals(AssignmentSolver.STAGES, result.phases().stream().map(Contract.Phase::name).toList());
        assertTrue(result.phases().stream().allMatch(Contract.Phase::exactOptimalityProven));
        // Grade 9 takes the experienced teacher; both prior assignments change.
        assertEquals(List.of(0L, 0L, 0L, 5L, 2L), result.metrics().objectiveVector());

        var assignments = new LinkedHashMap<String, String>();
        result.assignments().forEach(row -> assignments.put(row.demandId(), row.teacherId()));
        assertEquals(Map.of("D1", "MATH-ONLY", "D2", "FLEX"), assignments);
        var verified = solutionValidator.evaluate(snapshot, assignments, result.coverageOptimalityProven());
        assertEquals(result.metrics(), verified.metrics());
        assertEquals(result.loads(), verified.loads());
        assertEquals(result.checks(), verified.checks());
        assertTrue(result.checks().stream().anyMatch(check -> check.status() == Contract.CheckStatus.INSUFFICIENT_DATA));
        assertTrue(result.warnings().stream().anyMatch(warning -> warning.contains("INSUFFICIENT_DATA")));

        // Boot manages Jackson versions; check record/date handling on that classpath.
        assertEquals(snapshot, httpJson.readValue(httpJson.writeValueAsBytes(snapshot), Contract.Snapshot.class));
        assertEquals(result, httpJson.readValue(httpJson.writeValueAsBytes(result), Contract.Result.class));
    }

    @Test
    void cancellingOneRunDoesNotCancelAnotherRunOnTheSingleton() throws Exception {
        var snapshot = fixture();
        var cancelled = new Cancellation();
        cancelled.cancel();

        var stopped = solver.solve(snapshot, cancelled);
        assertEquals("CANCELLED", stopped.status());
        assertTrue(stopped.assignments().isEmpty());
        assertTrue(stopped.phases().isEmpty());

        var next = solver.solve(snapshot, new Cancellation());
        assertEquals("OPTIMAL", next.status(), () -> next.errors().toString());
        assertFalse(next.assignments().isEmpty());
    }
}
