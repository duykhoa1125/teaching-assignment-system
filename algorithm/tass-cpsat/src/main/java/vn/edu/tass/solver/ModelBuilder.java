package vn.edu.tass.solver;

import com.google.ortools.sat.*;
import static vn.edu.tass.solver.Contract.*;
import static vn.edu.tass.solver.InputValidator.*;
import java.util.*;

final class ModelBuilder {
    record Built(CpModel model, BoolVar[][] x, BoolVar[] y, LinearExpr coverage, LinearExpr soft) {}
    Built build(Prepared p) {
        Snapshot s=p.input();int nt=s.teachers().size(),nd=s.demands().size();
        CpModel m=new CpModel();BoolVar[][] x=new BoolVar[nt][nd];BoolVar[] y=new BoolVar[nd];
        LinearExprBuilder coverage=LinearExpr.newBuilder(),soft=LinearExpr.newBuilder();Config cfg=s.config();
        for(int j=0;j<nd;j++) {
            y[j]=m.newBoolVar("unassigned_"+j);LinearExprBuilder sum=LinearExpr.newBuilder().add(y[j]);
            for(int i=0;i<nt;i++) if(p.eligible()[i][j]) {
                x[i][j]=m.newBoolVar("assign_"+i+"_"+j);sum.add(x[i][j]);
                soft.addTerm(x[i][j],times(times(cfg.experienceWeight(),p.scale()),s.teachers().get(i).experiencePenalties().get(s.demands().get(j).id())));
            }
            m.addEquality(sum,1);
            if(cfg.coverageMode()!=CoverageMode.COMPLETE_GROUPS)coverage.addTerm(y[j],cfg.coverageMode()==CoverageMode.PERIODS?p.hours()[j]:1);
        }
        int groupNo=0;
        for(List<Integer> group:p.groups()) {
            LinearExprBuilder usedTeachers=LinearExpr.newBuilder();
            for(int i=0;i<nt;i++) {
                List<BoolVar> entries=new ArrayList<>();for(int j:group)if(x[i][j]!=null)entries.add(x[i][j]);
                if(entries.isEmpty())continue;
                BoolVar z=m.newBoolVar("group_"+groupNo+"_teacher_"+i);
                for(BoolVar v:entries)m.addLessOrEqual(v,z);
                m.addLessOrEqual(z,LinearExpr.sum(entries.toArray(BoolVar[]::new)));usedTeachers.add(z);
            }
            m.addLessOrEqual(usedTeachers,1);
            if(cfg.coverageMode()==CoverageMode.COMPLETE_GROUPS) {
                BoolVar incomplete=m.newBoolVar("incomplete_"+groupNo);
                m.addMaxEquality(incomplete,group.stream().map(j->y[j]).toArray(LinearArgument[]::new));coverage.add(incomplete);
            }
            groupNo++;
        }
        for(int i=0;i<nt;i++) {
            Teacher teacher=s.teachers().get(i);LinearExprBuilder a=LinearExpr.newBuilder();long maxA=0;
            for(int j=0;j<nd;j++)if(x[i][j]!=null){a.addTerm(x[i][j],p.hours()[j]);maxA=plus(maxA,p.hours()[j]);}
            for(HardCheck check:teacher.hardChecks())if(check.dataStatus()==CheckStatus.PASS) {
                LinearExprBuilder load=LinearExpr.newBuilder().add(plus(scaled(check.fixed(),p.scale(),"fixed"),scaled(check.converted(),p.scale(),"converted")));
                for(int j=0;j<nd;j++)if(x[i][j]!=null)load.addTerm(x[i][j],scaled(check.coefficients().get(s.demands().get(j).id()),p.scale(),"coefficient"));
                m.addLessOrEqual(load,scaled(check.limit(),p.scale(),"limit"));
            }
            if(teacher.workload().targetApplicable()) {
                long fixed=cfg.deviationBasis()==DeviationBasis.W?plus(p.f()[i],p.c()[i]):0;
                LinearExpr v=LinearExpr.newBuilder().add(a).add(fixed).build();
                IntVar under=m.newIntVar(0,p.q()[i],"under_"+i);
                IntVar over=m.newIntVar(0,Math.max(0,plus(maxA,fixed)-p.q()[i]),"over_"+i);
                m.addMaxEquality(under,new LinearArgument[]{LinearExpr.constant(0),LinearExpr.newBuilder().add(p.q()[i]).addTerm(v,-1)});
                m.addMaxEquality(over,new LinearArgument[]{LinearExpr.constant(0),LinearExpr.newBuilder().add(v).add(-p.q()[i])});
                soft.addTerm(under,cfg.loadWeight()).addTerm(over,cfg.loadWeight());
            }
        }
        for(PreviousAssignment previous:s.previousAssignments()) {
            Integer j=p.demandIndex().get(previous.demandId());if(j==null)continue;
            long weight=times(cfg.changeWeight(),p.scale());soft.add(weight);
            if(previous.teacherId()==null)soft.addTerm(y[j],-weight);
            else {Integer i=p.teacherIndex().get(previous.teacherId());if(i!=null && x[i][j]!=null)soft.addTerm(x[i][j],-weight);}
        }
        return new Built(m,x,y,coverage.build(),soft.build());
    }
}
