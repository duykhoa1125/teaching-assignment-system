package vn.edu.tass.solver;

import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import com.fasterxml.jackson.databind.node.*;
import java.nio.file.*;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;
import static vn.edu.tass.solver.Contract.*;
import static vn.edu.tass.solver.AssignmentService.*;

/** Compiled UNCHANGED in Greedy, Genetic and benchmark(CP-SAT) modules. */
class CommonSolverTest {
    private static SolverAlgorithm solver;
    @BeforeAll static void selectAlgorithm() throws Exception {
        String type=System.getProperty("algorithm.class","CP_SAT");
        if(type.equals("CP_SAT")) {AssignmentSolver cp=new AssignmentSolver();solver=new SolverAlgorithm(){public String name(){return "CP_SAT";}public Result solve(Snapshot s,Cancellation c){return cp.solve(s,c);}};}
        else solver=(SolverAlgorithm)Class.forName(type).getConstructor().newInstance();
    }
    private static ObjectNode tree() throws Exception {return (ObjectNode)Json.MAPPER.readTree(Path.of(System.getProperty("tass.fixtures"),"greedy-trap.json").toFile());}
    private static Snapshot read(ObjectNode tree) throws Exception {return Fixtures.read(tree);}
    private static Snapshot base() throws Exception {return read(tree());}
    private static void set(ObjectNode t,String p,Object value){Fixtures.set(t,p,value);}
    private static ObjectNode oneTeacher() throws Exception {ObjectNode t=tree();((ArrayNode)t.get("teachers")).remove(1);return t;}
    private static Map<String,String> map(Result r){return Fixtures.assignments(r);}
    private static void number(String expected,BigDecimal actual){SolverTest.number(expected,actual);}
    private static void candidate(Snapshot s,Result r){assertTrue(r.hasCandidate(),r.status()+" "+r.errors());new SolutionValidator().evaluate(s,map(r),false);}

    @ParameterizedTest @CsvSource({"greedy-trap.json,2,0","shortage.json,1,1","component-consistency.json,2,0","decimal-load.json,2,0"})
    void originalFixturesAndExpectedCoverage(String name,int assigned,int missing) throws Exception {
        var s=Json.MAPPER.readValue(Path.of(System.getProperty("tass.fixtures"),name).toFile(),Snapshot.class);var r=solver.solve(s);candidate(s,r);
        assertEquals(assigned,r.metrics().assignedComponents());assertEquals(missing,r.metrics().unassignedComponents());assertEquals(missing==0,r.dataReadyForOpening());
        assertTrue(r.checks().stream().anyMatch(c->c.status()==CheckStatus.INSUFFICIENT_DATA));
        if(!solver.name().equals("CP_SAT")){assertEquals("FEASIBLE",r.status());assertFalse(r.coverageOptimalityProven());assertFalse(r.softOptimalityProven());assertFalse(r.metrics().fullCoverageImpossibleProven());}
    }
    // Reuses the ORIGINAL CP-SAT 19-row invalid-input matrix through its test JAR.
    static Stream<Arguments> originalInvalidInputs(){return SolverTest.invalidInputs();}
    @ParameterizedTest @MethodSource("originalInvalidInputs")
    void originalInputValidationMatrix(String path,Object value) throws Exception {
        var t=tree();set(t,path,value);var r=solver.solve(read(t));assertEquals("INVALID_INPUT",r.status());assertTrue(r.phases().isEmpty());assertFalse(r.errors().isEmpty());
    }
    @Test void poc01GreedyTrap() throws Exception {var s=base();var r=solver.solve(s);candidate(s,r);assertEquals(Map.of("D1","MATH-ONLY","D2","FLEX"),map(r));}
    @Test void poc03UnverifiedQualificationIsNotEligibility() throws Exception {
        var t=tree();set(t,"/teachers/0/qualifications/1/verified",false);var s=read(t);var r=solver.solve(s);candidate(s,r);var d=r.assignments().stream().filter(a->a.demandId().equals("D2")).findFirst().orElseThrow();assertNull(d.teacherId());assertEquals("NO_QUALIFIED_TEACHER",d.reasonCode());
    }
    @Test void poc04CapacityAndHonestLocalReason() throws Exception {
        var s=read(oneTeacher());var r=solver.solve(s);candidate(s,r);assertEquals(1,r.metrics().assignedComponents());var missing=r.assignments().stream().filter(a->a.teacherId()==null).findFirst().orElseThrow();assertEquals("CAPACITY_EXCEEDED",missing.reasonCode());assertFalse(missing.evidence().isEmpty());
    }
    @Test void poc05And11OriginalDecimalFixture() throws Exception {
        var s=Json.MAPPER.readValue(Path.of(System.getProperty("tass.fixtures"),"decimal-load.json").toFile(),Snapshot.class);var r=solver.solve(s);candidate(s,r);var l=r.loads().get(0);number("3.125",l.A());number("4",l.W());number("4",l.Q());number("-0.875",l.deltaA());number("0",l.deltaW());
    }
    @Test void poc17ComponentsCanUseDifferentTeachers() throws Exception {
        var t=tree();((ArrayNode)t.get("scopes")).remove(1);set(t,"/scopes/0/requiredTypes",List.of("STANDARD","SPECIALIZED_TOPIC"));set(t,"/demands/1/subjectId","MATH");set(t,"/demands/1/type","SPECIALIZED_TOPIC");set(t,"/teachers/1/experiencePenalties/D2",0);var s=read(t);var r=solver.solve(s);candidate(s,r);assertEquals(2,r.metrics().assignedComponents());assertEquals(2,map(r).values().stream().filter(Objects::nonNull).distinct().count());
    }
    @Test void poc18LeaveAndOtherSemesterNotEligible() throws Exception {
        var t=tree();set(t,"/teachers/0/employments/0/status","FULL_TERM_LEAVE");set(t,"/teachers/0/workload/targetApplicable",false);var s=read(t);var r=solver.solve(s);candidate(s,r);assertNull(map(r).get("D2"));assertNull(r.loads().get(0).Q());assertNull(r.loads().get(0).under());
        set(t,"/teachers/0/employments/0/status","ACTIVE");set(t,"/teachers/0/employments/0/semesterId","OTHER");s=read(t);r=solver.solve(s);candidate(s,r);assertNull(map(r).get("D2"));
    }
    @Test void originalWrongLevelCase() throws Exception {var t=tree();set(t,"/teachers/0/qualifications/1/levelId","THCS");var s=read(t);var r=solver.solve(s);candidate(s,r);assertNull(map(r).get("D2"));}
    @Test void originalAnnualExpressionUsesOwnUnit() throws Exception {
        var t=oneTeacher();set(t,"/teachers/0/hardChecks/0/limit",2);set(t,"/teachers/0/hardChecks/1/dataStatus","PASS");set(t,"/teachers/0/hardChecks/1/fixed",8);set(t,"/teachers/0/hardChecks/1/converted",0);set(t,"/teachers/0/hardChecks/1/coefficients",Map.of("D1",2,"D2",3));set(t,"/teachers/0/hardChecks/1/limit",10);set(t,"/teachers/0/hardChecks/1/missingData",List.of());var s=read(t);var r=solver.solve(s);candidate(s,r);assertEquals("FLEX",map(r).get("D1"));assertNull(map(r).get("D2"));number("10",r.checks().get(1).value());
    }
    @Test void originalBaselineInfeasibilityCase() throws Exception {var t=tree();set(t,"/teachers/0/hardChecks/0/fixed",2);var r=solver.solve(read(t));assertEquals("INFEASIBLE",r.status());assertTrue(r.assignments().isEmpty());}
    @Test void originalNoTeachersCase() throws Exception {var t=tree();set(t,"/teachers",List.of());var s=read(t);var r=solver.solve(s);candidate(s,r);assertEquals(2,r.metrics().unassignedComponents());}
    @Test void originalCoverageModes() throws Exception {
        var t=oneTeacher();set(t,"/demands/1/periods",2);set(t,"/teachers/0/hardChecks/0/coefficients/D2",2);set(t,"/teachers/0/hardChecks/0/limit",2);set(t,"/teachers/0/experiencePenalties/D2",10);
        for(String mode:List.of("COMPONENTS","PERIODS","COMPLETE_GROUPS")){set(t,"/config/coverageMode",mode);var s=read(t);var r=solver.solve(s);candidate(s,r);assertEquals(1,r.metrics().assignedComponents());if(mode.equals("PERIODS"))assertEquals("FLEX",map(r).get("D2"));}
    }
    @Test void poc10OriginalChangeMetricCase() throws Exception {
        var t=tree();set(t,"/previousAssignments",List.of(Map.of("demandId","D1","teacherId","FLEX"),Map.of("demandId","REMOVED","teacherId","FLEX")));set(t,"/previousSource","V0");set(t,"/config/preservePolicy","PENALIZE_CHANGES");set(t,"/config/changeWeight",2);var s=read(t);var r=solver.solve(s);candidate(s,r);assertEquals(1,r.metrics().changes());assertEquals(1,r.metrics().addedDemands());assertEquals(1,r.metrics().removedDemands());assertEquals(1,r.metrics().objectiveVector().get(4));
    }
    @Test void originalScalingInvariant() throws Exception {var t=tree();var a=solver.solve(read(t));set(t,"/normalization/integerScale",1000);var b=solver.solve(read(t));assertEquals(map(a),map(b));assertEquals(a.metrics().softObjective()*10,b.metrics().softObjective());}
    @Test void poc09Cancellation() throws Exception {var c=new Cancellation();c.cancel();var r=solver.solve(base(),c);assertEquals("CANCELLED",r.status());assertTrue(r.assignments().isEmpty());}
    @Test void originalApplyAndStaleRevision() throws Exception {
        var s=base();var r=solver.solve(s);var store=new InMemoryPlanStore(s);var service=new AssignmentService(store);assertEquals(ApplyOutcome.APPLIED,service.apply(s,r,new Cancellation()).outcome());assertEquals("DRAFT",store.state());assertEquals(ApplyOutcome.STALE,service.apply(s,r,new Cancellation()).outcome());assertEquals(1,store.revision());
    }
    @Test void originalConcurrentApplyCase() throws Exception {
        var s=base();var r=solver.solve(s);var store=new InMemoryPlanStore(s);var service=new AssignmentService(store);var pool=Executors.newFixedThreadPool(2);var barrier=new CyclicBarrier(2);
        try{Callable<ApplyOutcome> task=()->{barrier.await();return service.apply(s,r,new Cancellation()).outcome();};var a=pool.submit(task);var b=pool.submit(task);assertEquals(Set.of(ApplyOutcome.APPLIED,ApplyOutcome.STALE),Set.of(a.get(5,TimeUnit.SECONDS),b.get(5,TimeUnit.SECONDS)));assertEquals(1,store.revision());}finally{pool.shutdownNow();}
    }
    @Test void originalChangedTokenVersionSnapshotStateCases() throws Exception {
        var s=base();var r=solver.solve(s);for(String path:List.of("/identity/sourceRevisionToken","/identity/versionId","/identity/snapshotId")){var t=tree();set(t,path,"CHANGED");var store=new InMemoryPlanStore(read(t));assertEquals(ApplyOutcome.STALE,new AssignmentService(store).apply(s,r,new Cancellation()).outcome());assertTrue(store.saved().isEmpty());}
        var store=new InMemoryPlanStore(s);store.replaceCurrent(s,"OPEN_FOR_FEEDBACK");assertEquals(ApplyOutcome.NOT_DRAFT,new AssignmentService(store).apply(s,r,new Cancellation()).outcome());
    }
    @Test void originalCancelledApplyPreservesSavedData() throws Exception {
        var s=base();var r=solver.solve(s);var store=new InMemoryPlanStore(s);var service=new AssignmentService(store);service.apply(s,r,new Cancellation());var saved=store.saved();var c=new Cancellation();c.cancel();assertEquals(ApplyOutcome.CANCELLED,service.apply(s,r,c).outcome());assertEquals(saved,store.saved());
    }
    @Test void originalPartialDraftCanApplyButNotOpen() throws Exception {
        var s=read(oneTeacher());var r=solver.solve(s);assertFalse(r.dataReadyForOpening());var store=new InMemoryPlanStore(s);assertEquals(ApplyOutcome.APPLIED,new AssignmentService(store).apply(s,r,new Cancellation()).outcome());assertEquals(1,store.saved().stream().filter(a->a.teacherId()==null && a.reason()!=null).count());
    }
    @Test void sameSeedReproducesDecisionsWhenNoTimeLimitIntervenes() throws Exception {
        var s=base();var a=solver.solve(s);var b=solver.solve(s);assertEquals(map(a),map(b));assertEquals(a.metrics(),b.metrics());
    }
    @Test void reportV2FixtureUsesFiveElementScore() throws Exception {
        Snapshot s=Json.MAPPER.readValue(Path.of(System.getProperty("tass.fixtures"),"report-five-stage.json").toFile(),Snapshot.class);
        Result r=solver.solve(s);candidate(s,r);assertEquals(5,r.metrics().objectiveVector().size());assertEquals(2,r.metrics().assignedComponents());
        assertNotNull(r.loads().get(0).T());
    }
    @Test void locksAreRespectedByEveryAlgorithm() throws Exception {
        ObjectNode t=tree();set(t,"/lockedAssignments",List.of(Map.of("demandId","D1","teacherId","FLEX","lockedBy","manager","lockedAt","2026-11-09T08:00:00+07:00","reason","Confirmed")));
        Snapshot s=read(t);Result r=solver.solve(s);candidate(s,r);assertEquals("FLEX",map(r).get("D1"));assertNull(map(r).get("D2"));
    }
    @Test void ineligibleLockReturnsExplicitConflictForEveryAlgorithm() throws Exception {
        ObjectNode t=tree();set(t,"/lockedAssignments",List.of(Map.of("demandId","D2","teacherId","MATH-ONLY","lockedBy","manager","lockedAt","2026-11-09T08:00:00+07:00","reason","Confirmed")));
        Result r=solver.solve(read(t));assertEquals("LOCK_CONFLICT",r.status());assertTrue(r.assignments().isEmpty());
    }
}
