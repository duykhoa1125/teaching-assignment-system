package vn.edu.tass.solver;

import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import com.fasterxml.jackson.databind.node.*;
import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;
import static vn.edu.tass.solver.Contract.*;
import static vn.edu.tass.solver.Fixtures.*;

class SolverTest {
    static AssignmentSolver solver;
    @BeforeAll static void nativeSolver(){solver=new AssignmentSolver();}
    static void number(String expected,BigDecimal actual){assertNotNull(actual);assertEquals(0,new BigDecimal(expected).compareTo(actual));}

    @Test void poc01GreedyTrapSavesFlexibleTeacherForOnlyPossibleDemand() throws Exception {
        Result r=solver.solve(base());assertEquals("OPTIMAL",r.status(),r.errors().toString());
        assertEquals(Map.of("D1","MATH-ONLY","D2","FLEX"),assignments(r));
        assertEquals(2,r.metrics().assignedComponents());assertTrue(r.coverageOptimalityProven());assertTrue(r.softOptimalityProven());
        assertTrue(r.dataReadyForOpening());assertEquals(2,r.checks().stream().filter(c->c.status()==CheckStatus.INSUFFICIENT_DATA).count());
    }
    @Test void poc03NoCandidateDoesNotInventTeacher() throws Exception {
        ObjectNode t=tree();set(t,"/teachers/0/qualifications/1/verified",false);Result r=solver.solve(read(t));
        Assignment missing=r.assignments().stream().filter(a->a.demandId().equals("D2")).findFirst().orElseThrow();
        assertNull(missing.teacherId());assertEquals("NO_QUALIFIED_TEACHER",missing.reasonCode());assertTrue(r.metrics().fullCoverageImpossibleProven());assertFalse(r.dataReadyForOpening());
    }
    @Test void poc04CapacityReturnsPartialAndLocalReason() throws Exception {
        Result r=solver.solve(read(oneTeacher()));assertEquals(1,r.metrics().assignedComponents());number("1",r.metrics().missingPeriods());
        Assignment missing=r.assignments().stream().filter(a->a.teacherId()==null).findFirst().orElseThrow();assertEquals("CAPACITY_EXCEEDED",missing.reasonCode());assertFalse(missing.evidence().isEmpty());
    }
    @Test void noTeachersProducesAllUnassigned() throws Exception {
        ObjectNode t=tree();set(t,"/teachers",List.of());Result r=solver.solve(read(t));assertEquals("OPTIMAL",r.status());assertEquals(2,r.metrics().unassignedComponents());
    }
    @Test void poc05And11ExactDecimalsOutsideAndConvertedLoad() throws Exception {
        ObjectNode t=oneTeacher();set(t,"/normalization/integerScale",1000);
        set(t,"/demands/0/periods",new BigDecimal("1.25"));set(t,"/demands/1/periods",new BigDecimal("1.875"));
        set(t,"/teachers/0/workload/base",5);set(t,"/teachers/0/workload/reduction",1);set(t,"/teachers/0/workload/fixedOutside",new BigDecimal("0.5"));set(t,"/teachers/0/workload/converted",new BigDecimal("0.375"));set(t,"/teachers/0/workload/outsideDemandIds",List.of("OUTSIDE-1"));
        set(t,"/teachers/0/hardChecks/0/fixed",new BigDecimal("0.5"));set(t,"/teachers/0/hardChecks/0/converted",new BigDecimal("0.375"));set(t,"/teachers/0/hardChecks/0/coefficients",Map.of("D1",new BigDecimal("1.25"),"D2",new BigDecimal("1.875")));set(t,"/teachers/0/hardChecks/0/limit",4);
        Result r=solver.solve(read(t));assertEquals("OPTIMAL",r.status());Load l=r.loads().get(0);number("3.125",l.A());number("4",l.W());number("4",l.Q());number("-0.875",l.deltaA());number("0",l.deltaW());
    }
    @Test void poc17ComponentsMayUseDifferentTeachers() throws Exception {
        ObjectNode t=tree();((ArrayNode)t.get("scopes")).remove(1);set(t,"/scopes/0/requiredTypes",List.of("STANDARD","SPECIALIZED_TOPIC"));set(t,"/demands/1/subjectId","MATH");set(t,"/demands/1/type","SPECIALIZED_TOPIC");set(t,"/teachers/1/experiencePenalties/D2",0);
        Result r=solver.solve(read(t));assertEquals(2,r.metrics().assignedComponents(),"Standard and topic can use different qualified teachers");assertEquals(0,r.metrics().incompleteGroups());
        set(t,"/teachers/0/hardChecks/0/limit",2);r=solver.solve(read(t));assertEquals(2,r.metrics().assignedComponents());new SolutionValidator().evaluate(read(t),Map.of("D1","FLEX","D2","FLEX"),false);
    }
    @Test void poc18LeaveIsNotUnderloadAndNoCrossSemesterEligibility() throws Exception {
        ObjectNode t=tree();set(t,"/teachers/0/employments/0/status","FULL_TERM_LEAVE");set(t,"/teachers/0/workload/targetApplicable",false);Result r=solver.solve(read(t));
        assertEquals(1,r.metrics().assignedComponents());assertNull(r.loads().get(0).Q());assertNull(r.loads().get(0).under());
        set(t,"/teachers/0/employments/0/status","ACTIVE");set(t,"/teachers/0/employments/0/semesterId","OTHER-SEMESTER");r=solver.solve(read(t));assertEquals(1,r.metrics().assignedComponents());
    }
    @Test void levelQualificationIsNotInherited() throws Exception {
        ObjectNode t=tree();set(t,"/teachers/0/qualifications/1/levelId","THCS");Result r=solver.solve(read(t));assertNull(assignments(r).get("D2"));
    }
    @Test void annualConstraintUsesItsOwnCoefficientsAndUnits() throws Exception {
        ObjectNode t=oneTeacher();set(t,"/teachers/0/hardChecks/0/limit",2);set(t,"/teachers/0/hardChecks/1/dataStatus","PASS");set(t,"/teachers/0/hardChecks/1/fixed",8);set(t,"/teachers/0/hardChecks/1/converted",0);set(t,"/teachers/0/hardChecks/1/coefficients",Map.of("D1",2,"D2",3));set(t,"/teachers/0/hardChecks/1/limit",10);set(t,"/teachers/0/hardChecks/1/missingData",List.of());
        Result r=solver.solve(read(t));assertEquals("FLEX",assignments(r).get("D1"));assertNull(assignments(r).get("D2"));number("10",r.checks().get(1).value());assertEquals("OVERTIME_HOURS",r.checks().get(1).unit());
    }
    @Test void fixedLoadViolationCanMakeModelInfeasibleEvenWithUnassignedVariables() throws Exception {
        ObjectNode t=tree();set(t,"/teachers/0/hardChecks/0/fixed",2);Result r=solver.solve(read(t));assertEquals("INFEASIBLE",r.status());assertTrue(r.assignments().isEmpty());assertNull(r.metrics());
    }
    @Test void coveragePeriodsAndComponentsAreDifferentObjectives() throws Exception {
        ObjectNode t=oneTeacher();set(t,"/demands/1/periods",2);set(t,"/teachers/0/hardChecks/0/coefficients/D2",2);set(t,"/teachers/0/hardChecks/0/limit",2);set(t,"/teachers/0/experiencePenalties/D2",10);
        Result count=solver.solve(read(t));assertEquals("FLEX",assignments(count).get("D1"));assertNull(assignments(count).get("D2"));
        set(t,"/config/coverageMode","PERIODS");Result periods=solver.solve(read(t));assertEquals("FLEX",assignments(periods).get("D2"));assertNull(assignments(periods).get("D1"));
    }
    @Test void completeGroupObjectiveAndPartialGroupsAreReported() throws Exception {
        ObjectNode t=components();set(t,"/config/coverageMode","COMPLETE_GROUPS");Result r=solver.solve(read(t));assertEquals(1,r.metrics().coverageObjective());assertEquals(0,r.metrics().completeGroups());
    }
    @Test void poc10ChangesCountTeacherSwitchOnceAndAddedRemovedSeparately() throws Exception {
        ObjectNode t=tree();set(t,"/previousAssignments",List.of(Map.of("demandId","D1","teacherId","FLEX"),Map.of("demandId","REMOVED","teacherId","FLEX")));set(t,"/previousSource","SOURCE-V0");set(t,"/config/preservePolicy","PENALIZE_CHANGES");set(t,"/config/changeWeight",2);
        Result r=solver.solve(read(t));assertEquals(1,r.metrics().changes());assertEquals(1,r.metrics().addedDemands());assertEquals(1,r.metrics().removedDemands());assertEquals(1,r.metrics().objectiveVector().get(4));
    }
    @Test void scalingDoesNotChangeRelativeLoadExperienceWeights() throws Exception {
        ObjectNode t=tree();Result a=solver.solve(read(t));set(t,"/normalization/integerScale",1000);Result b=solver.solve(read(t));assertEquals(assignments(a),assignments(b));assertEquals(a.metrics().softObjective()*10,b.metrics().softObjective());
    }
    @Test void poc13L1DoesNotDistinguishTenZeroFromFiveFive() throws Exception {
        ObjectNode t=tree();set(t,"/demands/1/subjectId","MATH");set(t,"/demands/1/classId","10B");set(t,"/scopes/1/subjectId","MATH");set(t,"/scopes/1/classId","10B");
        for(int i=0;i<2;i++){set(t,"/teachers/"+i+"/workload/base",10);set(t,"/teachers/"+i+"/hardChecks/0/limit",10);set(t,"/teachers/"+i+"/hardChecks/0/coefficients",Map.of("D1",5,"D2",5));set(t,"/teachers/"+i+"/experiencePenalties/D2",0);set(t,"/demands/"+i+"/periods",5);}
        Snapshot s=read(t);SolutionValidator v=new SolutionValidator();number("10",v.evaluate(s,Map.of("D1","FLEX","D2","FLEX"),false).metrics().loadDeviation());number("10",v.evaluate(s,Map.of("D1","FLEX","D2","MATH-ONLY"),false).metrics().loadDeviation());
    }
    @Test void independentValidatorRejectsIneligibleSplitAndOverCapacity() throws Exception {
        Snapshot s=base();assertThrows(InputValidator.InvalidInput.class,()->new SolutionValidator().evaluate(s,Map.of("D1","FLEX","D2","MATH-ONLY"),false));
        assertThrows(InputValidator.InvalidInput.class,()->new SolutionValidator().evaluate(s,Map.of("D1","FLEX","D2","FLEX"),false));
    }
    static Stream<Arguments> invalidInputs(){return Stream.of(
        Arguments.of("/demands/0/periods",0),Arguments.of("/demands/0/periods",new BigDecimal("1.875")),
        Arguments.of("/demands/0/semesterId","WRONG"),Arguments.of("/demands/1/id","D1"),
        Arguments.of("/scopes/0/status","UNDETERMINED"),Arguments.of("/scopes/0/requiredTypes",List.of("STANDARD","SPECIALIZED_TOPIC")),
        Arguments.of("/teachers/0/workload/fixedOutside",null),Arguments.of("/teachers/0/workload/outsideDemandIds",List.of("D1")),
        Arguments.of("/teachers/0/hardChecks/0/dataStatus","INSUFFICIENT_DATA"),Arguments.of("/teachers/0/hardChecks/0/coefficients",Map.of("D1",1)),
        Arguments.of("/teachers/0/employments/0/startsOn","2026-10-01"),Arguments.of("/teachers/0/experiencePenalties/D1",-1),
        Arguments.of("/prechecks/4/status","VIOLATION"),Arguments.of("/prechecks",List.of()),
        Arguments.of("/config/loadWeight",Long.MAX_VALUE),Arguments.of("/normalization/integerScale",0),
        Arguments.of("/config/totalSeconds",0),Arguments.of("/config/changeWeight",1),
        Arguments.of("/teachers/0/workload/base",new BigDecimal("1e30"))
    );}
    @ParameterizedTest @MethodSource("invalidInputs") void poc16BadDataStopsBeforeModel(String pointer,Object value) throws Exception {
        ObjectNode t=tree();set(t,pointer,value);Result r=solver.solve(read(t));assertEquals("INVALID_INPUT",r.status(),r.errors().toString());assertTrue(r.phases().isEmpty());assertFalse(r.errors().isEmpty());
    }
    @Test void poc14PhaseTwoUnknownKeepsPhaseOneAndDoesNotUpgradeProof() throws Exception {
        Map<String,String> chosen=new LinkedHashMap<>();chosen.put("D1","MATH-ONLY");chosen.put("D2","FLEX");
        AssignmentSolver fake=new AssignmentSolver((m,p,name,time,c)->name.equals("Z")?
            new AssignmentSolver.PhaseRun(new Phase(name,"FEASIBLE","TIME_LIMIT",0L,0.0,0.1,false),chosen):
            new AssignmentSolver.PhaseRun(new Phase(name,"UNKNOWN","TIME_LIMIT",null,null,0.1,false),null));
        Result r=fake.solve(base());assertEquals("FEASIBLE",r.status());assertEquals("Z",r.selectedPhase());assertEquals(chosen,assignments(r));assertFalse(r.coverageOptimalityProven());
    }
    @Test void phaseTwoOptimalDoesNotProvePhaseOneOptimal() throws Exception {
        Map<String,String> chosen=Map.of("D1","MATH-ONLY","D2","FLEX");
        AssignmentSolver fake=new AssignmentSolver((m,p,name,time,c)->new AssignmentSolver.PhaseRun(new Phase(name,name.equals("Z")?"FEASIBLE":"OPTIMAL","TEST",0L,0.0,0.1,!name.equals("Z")),chosen));
        Result r=fake.solve(base());assertFalse(r.coverageOptimalityProven());assertTrue(r.softOptimalityProven());assertEquals("FEASIBLE",r.status());
    }
    @Test void phaseOneUnknownNeverReadsAssignmentsOrStartsPhaseTwo() throws Exception {
        int[] calls={0};AssignmentSolver fake=new AssignmentSolver((m,p,name,time,c)->{calls[0]++;return new AssignmentSolver.PhaseRun(new Phase(name,"UNKNOWN","TIME_LIMIT",null,null,0,false),null);});
        Result r=fake.solve(base());assertEquals("UNKNOWN",r.status());assertEquals(1,calls[0]);assertTrue(r.assignments().isEmpty());
    }
    @Test void poc09CancelledRunHasNoApplicableCandidate() throws Exception {Cancellation token=new Cancellation();token.cancel();Result r=solver.solve(base(),token);assertEquals("CANCELLED",r.status());assertTrue(r.assignments().isEmpty());}
    @Test void phaseTwoDisabledRetainsRealNativeIncumbent() throws Exception {ObjectNode t=tree();set(t,"/config/phaseTwoSeconds",0);Result r=solver.solve(read(t));assertEquals("FEASIBLE",r.status());assertEquals(2,r.metrics().assignedComponents());assertEquals("NOT_RUN",r.phases().get(1).status());}
    @Test void backendFailureReturnsNoCandidate() throws Exception {AssignmentSolver broken=new AssignmentSolver((m,p,n,t,c)->{throw new IllegalStateException("simulated backend error");});var r=broken.solve(base());assertEquals("ERROR",r.status());assertTrue(r.assignments().isEmpty());}
    @ParameterizedTest @CsvSource({"greedy-trap.json,2,0","shortage.json,1,1","component-consistency.json,2,0","decimal-load.json,2,0"})
    void checkedInFixtures(String name,int assigned,int missing) throws Exception {var input=Json.MAPPER.readValue(java.nio.file.Path.of("fixtures",name).toFile(),Snapshot.class);var r=solver.solve(input);assertEquals("OPTIMAL",r.status(),r.errors().toString());assertEquals(assigned,r.metrics().assignedComponents());assertEquals(missing,r.metrics().unassignedComponents());}
}
