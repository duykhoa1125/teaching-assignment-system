package vn.edu.tass.solver;

import org.junit.jupiter.api.Test;
import com.fasterxml.jackson.databind.node.*;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static vn.edu.tass.solver.Contract.*;
import static vn.edu.tass.solver.Fixtures.*;

/** Regression cases derived from the current report, independent of the legacy PoC ranking. */
class ReportSolverTest {
    static ObjectNode report() throws Exception {
        ObjectNode t=tree();set(t,"/schemaVersion","tass-solver/2");
        set(t,"/config/deviationBasis","T");set(t,"/config/loadWeight",1);set(t,"/config/experienceWeight",1);set(t,"/config/changeWeight",1);
        set(t,"/config/preservePolicy","PENALIZE_CHANGES");set(t,"/config/totalSeconds",30);
        set(t,"/config/stageSeconds",Map.of("Z",5,"L1",5,"M",5,"experience",5,"change",5));
        set(t,"/config/gradeWeights",Map.of("9",3,"12",3,"other",1));
        for(int j=0;j<2;j++) {set(t,"/demands/"+j+"/startsOn",t.at("/period/startsOn"));set(t,"/demands/"+j+"/endsOn",t.at("/period/endsOn"));}
        return t;
    }
    static ObjectNode interchangeable() throws Exception {
        ObjectNode t=report();set(t,"/scopes/1/classId","10B");set(t,"/scopes/1/className","10B");set(t,"/scopes/1/subjectId","MATH");
        set(t,"/demands/1/classId","10B");set(t,"/demands/1/subjectId","MATH");set(t,"/teachers/1/experiencePenalties/D2",0);
        return t;
    }
    static Map<String,String> lock(String demand,String teacher){return Map.of("demandId",demand,"teacherId",teacher,"lockedBy","manager","lockedAt","2026-11-09T08:00:00+07:00","reason","Confirmed assignment");}

    @Test void fiveStagesUseIndependentObjectivesAndProveEach() throws Exception {
        Result r=new AssignmentSolver().solve(read(report()));assertEquals("OPTIMAL",r.status(),r.errors().toString());
        assertEquals(AssignmentSolver.STAGES,r.phases().stream().map(Phase::name).toList());
        assertTrue(r.phases().stream().allMatch(Phase::exactOptimalityProven));assertEquals(List.of(0L,0L,0L,0L,0L),r.metrics().objectiveVector());
    }
    @Test void maxDeviationBreaksTheL1TenZeroVersusFiveFiveTie() throws Exception {
        ObjectNode t=interchangeable();
        for(int i=0;i<2;i++){set(t,"/teachers/"+i+"/workload/base",10);set(t,"/teachers/"+i+"/hardChecks/0/limit",10);set(t,"/teachers/"+i+"/hardChecks/0/coefficients",Map.of("D1",5,"D2",5));set(t,"/demands/"+i+"/periods",5);}
        Result r=new AssignmentSolver().solve(read(t));assertEquals("OPTIMAL",r.status());assertEquals(2,assignments(r).values().stream().distinct().count());
        SolverTest.number("10",r.metrics().loadDeviation());SolverTest.number("5",r.metrics().maxLoadDeviation());
    }
    @Test void finalGradeExperienceComesBeforeSoftPreservation() throws Exception {
        ObjectNode t=interchangeable();set(t,"/scopes/0/gradeId","8");set(t,"/scopes/1/gradeId","9");
        set(t,"/teachers/1/experiencePenalties",Map.of("D1",5,"D2",5));
        set(t,"/previousAssignments",List.of(Map.of("demandId","D1","teacherId","FLEX"),Map.of("demandId","D2","teacherId","MATH-ONLY")));set(t,"/previousSource","same-round-prior-draft");
        Result r=new AssignmentSolver().solve(read(t));assertEquals(Map.of("D1","MATH-ONLY","D2","FLEX"),assignments(r));
        assertEquals(5,r.metrics().experiencePenalty());assertEquals(2,r.metrics().changes());assertEquals(List.of(0L,0L,0L,5L,2L),r.metrics().objectiveVector());
    }
    @Test void hardLockOverridesExperienceAndIsIndependentlyValidated() throws Exception {
        ObjectNode t=interchangeable();set(t,"/lockedAssignments",List.of(lock("D1","FLEX")));
        set(t,"/teachers/0/experiencePenalties/D1",999);Result r=new AssignmentSolver().solve(read(t));assertEquals("FLEX",assignments(r).get("D1"));
        assertThrows(InputValidator.InvalidInput.class,()->new SolutionValidator().evaluate(read(t),Map.of("D1","MATH-ONLY","D2","FLEX"),false));
    }
    @Test void incompatibleLocksFailBeforeSearch() throws Exception {
        ObjectNode t=interchangeable();set(t,"/lockedAssignments",List.of(lock("D1","FLEX"),lock("D2","FLEX")));
        Result r=new AssignmentSolver().solve(read(t));assertEquals("LOCK_CONFLICT",r.status());assertTrue(r.phases().isEmpty());assertTrue(r.assignments().isEmpty());
    }
    @Test void unqualifiedLockIsNeverSilentlyRemoved() throws Exception {
        ObjectNode t=report();set(t,"/lockedAssignments",List.of(lock("D2","MATH-ONLY")));
        assertEquals("LOCK_CONFLICT",new AssignmentSolver().solve(read(t)).status());
    }
    @Test void v2RejectsThreeDecimalsEvenWhenScaleWouldRepresentThemExactly() throws Exception {
        ObjectNode t=report();set(t,"/normalization/integerScale",1000);set(t,"/demands/0/periods",new BigDecimal("1.875"));
        assertEquals("INVALID_INPUT",new AssignmentSolver().solve(read(t)).status());
    }
    @Test void enrichmentIsAnIndependentComponent() throws Exception {
        ObjectNode t=report();set(t,"/demands/0/type","ENRICHMENT");set(t,"/scopes/0/requiredTypes",List.of("ENRICHMENT"));
        assertEquals("OPTIMAL",new AssignmentSolver().solve(read(t)).status());
    }
    @Test void excessReductionUsesTMinusBaseRatherThanClampedQ() throws Exception {
        ObjectNode t=report();set(t,"/teachers/0/workload/reduction",2);
        Map<String,String> m=new LinkedHashMap<>();m.put("D1",null);m.put("D2",null);
        Load l=new SolutionValidator().evaluate(read(t),m,false).loads().get(0);
        SolverTest.number("2",l.T());SolverTest.number("1",l.deltaT());SolverTest.number("1",l.over());
    }
    @Test void mixedEffectiveIntervalsAreRejectedRatherThanAddedAsOneWeeklyLoad() throws Exception {
        ObjectNode t=report();set(t,"/demands/1/endsOn","2026-11-01");Result r=new AssignmentSolver().solve(read(t));
        assertEquals("INVALID_INPUT",r.status());assertTrue(r.errors().get(0).message().contains("uniform effective interval"));
    }
    @Test void laterUnknownPreservesCandidateWithoutInventingProof() throws Exception {
        Snapshot s=read(report());Map<String,String> m=Map.of("D1","MATH-ONLY","D2","FLEX");
        AssignmentSolver solver=new AssignmentSolver((b,p,name,time,c)->new AssignmentSolver.PhaseRun(
            new Phase(name,name.equals("Z")?"FEASIBLE":"UNKNOWN","TIME_LIMIT",name.equals("Z")?0L:null,name.equals("Z")?0.0:null,0,false),name.equals("Z")?m:null));
        Result r=solver.solve(s);assertEquals("FEASIBLE",r.status());assertEquals(m,assignments(r));assertFalse(r.coverageOptimalityProven());assertFalse(r.softOptimalityProven());assertEquals(5,r.phases().size());
    }
    @Test void laterInfeasibilityIsModelErrorNotTeacherShortage() throws Exception {
        AssignmentSolver solver=new AssignmentSolver((b,p,name,time,c)->name.equals("Z")?
            new AssignmentSolver.PhaseRun(new Phase(name,"OPTIMAL","EXACT_OPTIMUM",0L,0.0,0,true),Map.of("D1","MATH-ONLY","D2","FLEX")):
            new AssignmentSolver.PhaseRun(new Phase(name,"INFEASIBLE","PROVEN_INFEASIBLE",null,null,0,false),null));
        Result r=solver.solve(read(report()));assertEquals("ERROR",r.status());assertTrue(r.assignments().isEmpty());
    }
    @Test void verifiedYearsConvertMonotonicallyWithoutTreatingUnknownAsZero() {
        var date=java.time.LocalDate.of(2026,11,9);
        var policy=new ExperienceScoring.Policy(List.of(new ExperienceScoring.Band(BigDecimal.ZERO,6),new ExperienceScoring.Band(new BigDecimal("5"),0)),null,"confirmed-demo-config");
        assertEquals(6,ExperienceScoring.penalty(new ExperienceScoring.Evidence(ExperienceScoring.Status.NO_EXPERIENCE,BigDecimal.ZERO,date,"profile"),date,policy));
        assertEquals(0,ExperienceScoring.penalty(new ExperienceScoring.Evidence(ExperienceScoring.Status.HAS_EXPERIENCE,new BigDecimal("5"),date,"profile"),date,policy));
        assertThrows(InputValidator.InvalidInput.class,()->ExperienceScoring.penalty(new ExperienceScoring.Evidence(ExperienceScoring.Status.UNKNOWN,null,date,null),date,policy));
    }
    @Test void experiencePolicyRejectsIncreasingPenaltyAndFutureEvidence() {
        var date=java.time.LocalDate.of(2026,11,9);
        var wrong=new ExperienceScoring.Policy(List.of(new ExperienceScoring.Band(BigDecimal.ZERO,0),new ExperienceScoring.Band(BigDecimal.ONE,5)),null,"config");
        var evidence=new ExperienceScoring.Evidence(ExperienceScoring.Status.HAS_EXPERIENCE,BigDecimal.ONE,date,"profile");
        assertThrows(InputValidator.InvalidInput.class,()->ExperienceScoring.penalty(evidence,date,wrong));
        var policy=new ExperienceScoring.Policy(List.of(new ExperienceScoring.Band(BigDecimal.ZERO,5)),null,"config");
        assertThrows(InputValidator.InvalidInput.class,()->ExperienceScoring.penalty(evidence,date.minusDays(1),policy));
    }
}
