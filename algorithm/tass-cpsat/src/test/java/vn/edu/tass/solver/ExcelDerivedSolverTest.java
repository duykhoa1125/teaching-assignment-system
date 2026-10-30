package vn.edu.tass.solver;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static vn.edu.tass.solver.Contract.*;

/** Anonymized, source-cell-derived examples. Policy and qualification fields are toy assumptions. */
class ExcelDerivedSolverTest {
    private static Snapshot fixture(String name) throws Exception {
        return Json.MAPPER.readValue(Path.of("fixtures", name).toFile(), Snapshot.class);
    }
    private static void equalDecimal(String expected, BigDecimal actual) {
        assertNotNull(actual);
        assertEquals(0, new BigDecimal(expected).compareTo(actual));
    }
    private static Map<String, String> assigned(Result result) {
        return result.assignments().stream().collect(Collectors.toMap(Assignment::demandId, Assignment::teacherId));
    }

    @Test void hk1EightScienceClassesAndTwoPhysicsClassesMatchSourceTotals() throws Exception {
        Result result = new AssignmentSolver().solve(fixture("excel-derived-hk1.json"));
        assertEquals("OPTIMAL", result.status(), result.errors().toString());
        assertEquals(10, result.metrics().assignedComponents());
        assertEquals(0, result.metrics().unassignedComponents());
        assertTrue(result.coverageOptimalityProven());
        assertTrue(result.softOptimalityProven());
        Map<String, String> assigned = assigned(result);
        for (String id : new String[]{"6A3", "8A5", "8A6", "8A8", "8A9", "9A2", "9A3", "9A4"}) {
            assertEquals("E26-T1", assigned.get("D-" + id), id);
        }
        assertEquals("E26-T7", assigned.get("D-12A1"));
        assertEquals("E26-T7", assigned.get("D-12A4"));
        Map<String, Load> loads = result.loads().stream().collect(Collectors.toMap(Load::teacherId, Function.identity()));
        Load science = loads.get("E26-T1");
        equalDecimal("13.2", science.A()); // E26 H7: 4 + 4*1.25 + 3*1.4
        equalDecimal("0", science.F());
        equalDecimal("4", science.C());    // E26 J7, treated as toy converted load
        equalDecimal("17.2", science.W()); // E26 N7
        equalDecimal("19", science.Q());
        Load physics = loads.get("E26-T7");
        equalDecimal("4", physics.A());
        equalDecimal("8", physics.F());
        equalDecimal("8", physics.C());
        equalDecimal("20", physics.W());  // E26 N57
        equalDecimal("17", physics.Q());
        equalDecimal("4.8", result.metrics().loadDeviation());
        assertTrue(result.checks().stream().filter(c -> c.period() == CheckPeriod.WEEKLY)
                .allMatch(c -> c.status() == CheckStatus.PASS));
    }

    @Test void hk2UsesTwoDetailRowsDespiteStaleZeroClassSummary() throws Exception {
        Result result = new AssignmentSolver().solve(fixture("excel-derived-hk2-stale-summary.json"));
        assertEquals("OPTIMAL", result.status(), result.errors().toString());
        assertEquals(2, result.metrics().assignedComponents());
        assertEquals("E26-T8", assigned(result).get("D-12A3-TOPIC"));
        assertEquals("E26-T8", assigned(result).get("D-12TH-TOPIC"));
        Load load = result.loads().get(0);
        equalDecimal("6", load.A());      // E26 W65; U71 + U72 = 2 detail classes
        equalDecimal("4", load.C());      // E26 Y65, toy mapping
        equalDecimal("10", load.W());     // E26 AC65
        equalDecimal("10", load.Q());     // toy B=10; E26 AG65 is blank
    }

    @Test void quarterPeriodsRequireAtLeastHundredthScale() throws Exception {
        ObjectNode data = (ObjectNode) Json.MAPPER.readTree(Path.of("fixtures", "excel-derived-hk1.json").toFile());
        ((ObjectNode) data.get("normalization")).put("integerScale", 10);
        Result result = new AssignmentSolver().solve(Json.MAPPER.treeToValue(data, Snapshot.class));
        assertEquals("INVALID_INPUT", result.status());
        assertTrue(result.phases().isEmpty());
        assertTrue(result.errors().stream().anyMatch(e -> e.path().contains("periods") || e.path().contains("coefficient")));
    }
}
