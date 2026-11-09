package vn.edu.tass.solver;

import com.google.ortools.sat.*;
import static vn.edu.tass.solver.Contract.*;
import static vn.edu.tass.solver.InputValidator.*;
import java.util.*;

final class ModelBuilder {
    record Built(CpModel model, BoolVar[][] x, BoolVar[] y, List<LinearExpr> objectives) {
        LinearExpr objective(int index) {return objectives.get(index);}
    }
    Built build(Prepared p) {
        Snapshot s=p.input();int nt=s.teachers().size(),nd=s.demands().size();
        CpModel m=new CpModel();BoolVar[][] x=new BoolVar[nt][nd];BoolVar[] y=new BoolVar[nd];
        LinearExprBuilder coverage=LinearExpr.newBuilder(),loadObjective=LinearExpr.newBuilder(),experience=LinearExpr.newBuilder(),changes=LinearExpr.newBuilder();Config cfg=s.config();
        Map<String,Scope> scopes=new HashMap<>();s.scopes().forEach(sc->scopes.put(sc.key(),sc));
        for(int j=0;j<nd;j++) {
            y[j]=m.newBoolVar("unassigned_"+j);LinearExprBuilder sum=LinearExpr.newBuilder().add(y[j]);
            for(int i=0;i<nt;i++) if(p.eligible()[i][j]) {
                x[i][j]=m.newBoolVar("assign_"+i+"_"+j);sum.add(x[i][j]);
                Demand d=s.demands().get(j);
                experience.addTerm(x[i][j],times(cfg.gradeWeight(scopes.get(d.groupKey()).gradeId()),s.teachers().get(i).experiencePenalties().get(d.id())));
            }
            m.addEquality(sum,1);
            if(cfg.coverageMode()!=CoverageMode.COMPLETE_GROUPS)coverage.addTerm(y[j],cfg.coverageMode()==CoverageMode.PERIODS?p.hours()[j]:1);
        }
        int groupNo=0;
        for(List<Integer> group:p.groups()) {
            if(cfg.coverageMode()==CoverageMode.COMPLETE_GROUPS) {
                BoolVar incomplete=m.newBoolVar("incomplete_"+groupNo);
                m.addMaxEquality(incomplete,group.stream().map(j->y[j]).toArray(LinearArgument[]::new));coverage.add(incomplete);
            }
            groupNo++;
        }
        for(LockedAssignment lock:s.lockedAssignments())m.addEquality(x[p.teacherIndex().get(lock.teacherId())][p.demandIndex().get(lock.demandId())],1);
        List<IntVar> deviations=new ArrayList<>();long maxDeviation=0;
        for(int i=0;i<nt;i++) {
            Teacher teacher=s.teachers().get(i);LinearExprBuilder a=LinearExpr.newBuilder();long maxA=0;
            for(int j=0;j<nd;j++)if(x[i][j]!=null){a.addTerm(x[i][j],p.hours()[j]);maxA=plus(maxA,p.hours()[j]);}
            for(HardCheck check:teacher.hardChecks())if(check.dataStatus()==CheckStatus.PASS) {
                LinearExprBuilder load=LinearExpr.newBuilder().add(plus(scaled(check.fixed(),p.scale(),"fixed"),scaled(check.converted(),p.scale(),"converted")));
                for(int j=0;j<nd;j++)if(x[i][j]!=null)load.addTerm(x[i][j],scaled(check.coefficients().get(s.demands().get(j).id()),p.scale(),"coefficient"));
                m.addLessOrEqual(load,scaled(check.limit(),p.scale(),"limit"));
            }
            if(teacher.workload().targetApplicable()) {
                long fixed=plus(plus(p.f()[i],p.c()[i]),p.r()[i]);
                LinearExpr v=LinearExpr.newBuilder().add(a).add(fixed).build();
                long bound=Math.max(p.b()[i],Math.abs(plus(maxA,fixed)-p.b()[i]));
                IntVar deviation=m.newIntVar(0,bound,"deviation_"+i);
                m.addAbsEquality(deviation,LinearExpr.newBuilder().add(v).add(-p.b()[i]));
                deviations.add(deviation);maxDeviation=Math.max(maxDeviation,bound);loadObjective.add(deviation);
            }
        }
        for(PreviousAssignment previous:s.previousAssignments()) {
            Integer j=p.demandIndex().get(previous.demandId());if(j==null)continue;
            if(cfg.preservePolicy()!=PreservePolicy.PENALIZE_CHANGES)continue;
            changes.add(1);
            if(previous.teacherId()==null)changes.addTerm(y[j],-1);
            else {Integer i=p.teacherIndex().get(previous.teacherId());if(i!=null && x[i][j]!=null)changes.addTerm(x[i][j],-1);}
        }
        IntVar maximum=m.newIntVar(0,maxDeviation,"max_deviation");
        if(deviations.isEmpty())m.addEquality(maximum,0);else m.addMaxEquality(maximum,deviations.toArray(IntVar[]::new));
        return new Built(m,x,y,List.of(coverage.build(),loadObjective.build(),LinearExpr.term(maximum,1),experience.build(),changes.build()));
    }
}
