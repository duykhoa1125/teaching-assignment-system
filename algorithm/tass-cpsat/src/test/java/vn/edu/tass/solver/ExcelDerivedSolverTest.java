package vn.edu.tass.solver;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static vn.edu.tass.solver.Contract.*;

/** Self-contained solver cases transcribed from the 2026-2027 physics assignment workbook. */
class ExcelDerivedSolverTest {
    private static BigDecimal decimal(String value) {
        return new BigDecimal(value);
    }

    private static void equalDecimal(String expected, BigDecimal actual) {
        assertNotNull(actual);
        assertEquals(0, decimal(expected).compareTo(actual));
    }

    private static Map<String, String> assigned(Result result) {
        return result.assignments().stream()
                .collect(Collectors.toMap(Assignment::demandId, Assignment::teacherId));
    }

    private static Demand demand(String id, String classId, String subject, String semester,
                                 DemandType type, String periods, String sourceCell) {
        return new Demand(id, classId, subject, semester, type, decimal(periods),
                "E26 teacher sheet " + sourceCell);
    }

    private static Scope scope(Demand demand) {
        String grade = demand.classId().replaceFirst("\\D.*", "");
        boolean science = demand.subjectId().equals("SCIENCE");
        return new Scope(demand.classId(), "Lớp " + demand.classId(), demand.subjectId(),
                science ? "Khoa học tự nhiên" : "Vật lý", grade,
                science ? "THCS" : "THPT", Applicability.APPLICABLE,
                List.of(demand.type()), "E26 class code; applicability is a test assumption");
    }

    private static Teacher teacher(String id, String subject, String level, String semester,
                                   Period period, String base, String fixedOutside,
                                   String converted, String weeklyLimit, List<Demand> demands) {
        Map<String, BigDecimal> coefficients = new LinkedHashMap<>();
        Map<String, Long> penalties = new LinkedHashMap<>();
        for (Demand demand : demands) {
            coefficients.put(demand.id(), demand.subjectId().equals(subject)
                    ? demand.periods() : BigDecimal.ZERO);
            penalties.put(demand.id(), 0L);
        }
        Workload workload = new Workload(decimal(base), BigDecimal.ZERO, decimal(fixedOutside),
                decimal(converted), true, "E26 totals; B/F/C mapping is a test assumption",
                id + "-DEMO-BASELINE", fixedOutside.equals("0")
                        ? List.of() : List.of(id + "-OTHER-CLASSES"));
        HardCheck weekly = new HardCheck("WEEKLY-DEMO", "BR-06", CheckPeriod.WEEKLY,
                "each teaching week in " + semester, "PERIODS_PER_WEEK", CheckStatus.PASS,
                decimal(fixedOutside), decimal(converted), coefficients, decimal(weeklyLimit),
                List.of(), "E26 workload; cap is a test assumption");
        HardCheck annual = new HardCheck("ANNUAL", "BR-06", CheckPeriod.ANNUAL,
                "2026-2027", "OVERTIME_HOURS", CheckStatus.INSUFFICIENT_DATA,
                null, null, Map.of(), null, List.of("Approved annual conversion is missing"),
                "Annual rule is unknown in Excel");
        return new Teacher(id, id,
                List.of(new Employment("DEMO-SCHOOL", semester, period.startsOn(), period.endsOn(),
                        EmploymentStatus.ACTIVE, "Active status is a test assumption")),
                List.of(new Qualification(subject, level, period.startsOn(), period.endsOn(),
                        true, "Qualification is a test assumption")),
                workload, penalties, List.of(weekly, annual));
    }

    private static Snapshot snapshot(boolean hk2, long scale) {
        String semester = hk2 ? "2026-HK2" : "2026-HK1";
        Period period = hk2
                ? new Period(LocalDate.parse("2027-01-16"), LocalDate.parse("2027-05-31"))
                : new Period(LocalDate.parse("2026-09-01"), LocalDate.parse("2027-01-15"));
        List<Demand> demands = new ArrayList<>();
        if (hk2) {
            // E26 U65 is a stale cached zero: SUM(U66:U70) omits detail rows 71-72.
            demands.add(demand("D-12A3-TOPIC", "12A3", "PHYSICS", semester,
                    DemandType.SPECIALIZED_TOPIC, "3", "T71/U71/W71"));
            demands.add(demand("D-12TH-TOPIC", "12TH", "PHYSICS", semester,
                    DemandType.SPECIALIZED_TOPIC, "3", "T72/U72/W72"));
        } else {
            demands.add(demand("D-6A3", "6A3", "SCIENCE", semester,
                    DemandType.STANDARD, "4", "E8/H8"));
            for (String classId : List.of("8A5", "8A6", "8A8", "8A9")) {
                demands.add(demand("D-" + classId, classId, "SCIENCE", semester,
                        DemandType.STANDARD, "1.25", "E10/F10/G10/H10"));
            }
            for (String classId : List.of("9A2", "9A3", "9A4")) {
                demands.add(demand("D-" + classId, classId, "SCIENCE", semester,
                        DemandType.STANDARD, "1.4", "E12/F12/G12/H12"));
            }
            for (String classId : List.of("12A1", "12A4")) {
                demands.add(demand("D-" + classId, classId, "PHYSICS", semester,
                        DemandType.STANDARD, "2", "E64/F64/G64/H64"));
            }
        }
        List<Teacher> teachers = hk2
                ? List.of(teacher("E26-T8", "PHYSICS", "THPT", semester, period,
                        "10", "0", "4", "10", demands))
                : List.of(
                        teacher("E26-T1", "SCIENCE", "THCS", semester, period,
                                "19", "0", "4", "25", demands),
                        teacher("E26-T7", "PHYSICS", "THPT", semester, period,
                                "17", "8", "8", "25", demands));
        List<Precheck> prechecks = new ArrayList<>();
        for (String rule : List.of("BR-04", "BR-16", "BR-17", "BR-18", "BR-19", "BR-20", "BR-21")) {
            CheckStatus status = rule.equals("BR-04") || rule.equals("BR-17")
                    ? CheckStatus.PASS : CheckStatus.NOT_APPLICABLE;
            prechecks.add(new Precheck(rule, status, "EXCEL-DEMO-NOT-APPROVED",
                    "Synthetic test; school rule not verified"));
        }
        return new Snapshot("tass-solver/1",
                new Identity("DEMO-SCHOOL", semester, "R1", "P1", "V1", 0,
                        hk2 ? "E26-HK2-STALE-U65" : "E26-HK1-TEN-DEMANDS",
                        "E26-CELLS", "EXCEL-DEMO-NOT-APPROVED", "EXCEL-DEMO-1"),
                period, new Normalization(scale, "PERIODS_PER_WEEK", LoadBasis.FIXED_WEEKLY, "EXACT"),
                new Config(CoverageMode.COMPONENTS, DeviationBasis.W, PreservePolicy.REOPTIMIZE,
                        1, 0, 0, 20, 8, 8, 1, 42,
                        "Excel-derived test; qualifications, policy and caps are assumptions", true),
                demands.stream().map(ExcelDerivedSolverTest::scope).toList(), demands, teachers,
                List.of(), null, prechecks, "Toy weekly cap and unknown annual rule");
    }

    @Test void hk1EightScienceClassesAndTwoPhysicsClassesMatchSourceTotals() {
        Result result = new AssignmentSolver().solve(snapshot(false, 100));
        assertEquals("OPTIMAL", result.status(), result.errors().toString());
        assertEquals(10, result.metrics().assignedComponents());
        assertEquals(0, result.metrics().unassignedComponents());
        assertTrue(result.coverageOptimalityProven());
        assertTrue(result.softOptimalityProven());
        Map<String, String> assigned = assigned(result);
        for (String id : List.of("6A3", "8A5", "8A6", "8A8", "8A9", "9A2", "9A3", "9A4")) {
            assertEquals("E26-T1", assigned.get("D-" + id), id);
        }
        assertEquals("E26-T7", assigned.get("D-12A1"));
        assertEquals("E26-T7", assigned.get("D-12A4"));
        Map<String, Load> loads = result.loads().stream()
                .collect(Collectors.toMap(Load::teacherId, Function.identity()));
        Load science = loads.get("E26-T1");
        equalDecimal("13.2", science.A()); // E26 H7 = 4 + 4*1.25 + 3*1.4
        equalDecimal("0", science.F());
        equalDecimal("4", science.C());    // E26 J7; demo mapping
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

    @Test void hk2UsesTwoDetailRowsDespiteStaleZeroClassSummary() {
        Result result = new AssignmentSolver().solve(snapshot(true, 100));
        assertEquals("OPTIMAL", result.status(), result.errors().toString());
        assertEquals(2, result.metrics().assignedComponents());
        assertEquals("E26-T8", assigned(result).get("D-12A3-TOPIC"));
        assertEquals("E26-T8", assigned(result).get("D-12TH-TOPIC"));
        Load load = result.loads().get(0);
        equalDecimal("6", load.A());      // E26 W65; U71+U72 = 2 detail classes
        equalDecimal("4", load.C());      // E26 Y65; demo mapping
        equalDecimal("10", load.W());     // E26 AC65
        equalDecimal("10", load.Q());     // demo B=10; E26 AG65 is blank
    }

    @Test void quarterPeriodsRequireAtLeastHundredthScale() {
        Result result = new AssignmentSolver().solve(snapshot(false, 10));
        assertEquals("INVALID_INPUT", result.status());
        assertTrue(result.phases().isEmpty());
        assertTrue(result.errors().stream().anyMatch(e ->
                e.path().contains("periods") || e.path().contains("coefficient")));
    }
}
