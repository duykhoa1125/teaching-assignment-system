package vn.edu.tass.solver;

import static vn.edu.tass.solver.Contract.*;
import static vn.edu.tass.solver.InputValidator.*;
import java.math.BigDecimal;
import java.util.*;

/** Recomputes business loads with BigDecimal; never reads solver load/under/over variables. */
public final class SolutionValidator {
    public record Evaluation(List<Load> loads,List<CheckResult> checks,Metrics metrics) {}
    public Evaluation evaluate(Snapshot s,Map<String,String> assignments,boolean coverageProven) {
        Prepared p=new InputValidator().validate(s);
        require(assignments.keySet().equals(p.demandIndex().keySet()),"solution","Exactly one entry per demand required");
        Map<String,String> groupTeachers=new HashMap<>();Map<String,BigDecimal> totals=new HashMap<>();
        BigDecimal total=BigDecimal.ZERO,assigned=BigDecimal.ZERO;long exp=0,changes=0;int count=0,added=0,removed=0;
        Map<String,PreviousAssignment> prev=new HashMap<>();s.previousAssignments().forEach(a->prev.put(a.demandId(),a));
        for(Demand d:s.demands()) {
            total=total.add(d.periods());String teacher=assignments.get(d.id());
            if(teacher!=null) {
                Integer i=p.teacherIndex().get(teacher);require(i!=null && p.eligible()[i][p.demandIndex().get(d.id())],"solution."+d.id(),"Ineligible teacher");
                String old=groupTeachers.putIfAbsent(d.groupKey(),teacher);require(old==null || old.equals(teacher),"solution."+d.id(),"Components must share teacher");
                totals.merge(teacher,d.periods(),BigDecimal::add);assigned=assigned.add(d.periods());count++;exp=plus(exp,s.teachers().get(i).experiencePenalties().get(d.id()));
            }
            if(prev.containsKey(d.id())) {if(!Objects.equals(prev.get(d.id()).teacherId(),teacher))changes++;}
            else added++;
        }
        for(String old:prev.keySet())if(!p.demandIndex().containsKey(old))removed++;
        List<Load> loads=new ArrayList<>();List<CheckResult> checks=new ArrayList<>();BigDecimal deviation=BigDecimal.ZERO;
        for(Teacher t:s.teachers()) {
            Workload w=t.workload();BigDecimal a=totals.getOrDefault(t.id(),BigDecimal.ZERO),q=w.base().subtract(w.reduction()).max(BigDecimal.ZERO),all=a.add(w.fixedOutside()).add(w.converted());
            BigDecimal da=w.targetApplicable()?a.subtract(q):null,dw=w.targetApplicable()?all.subtract(q):null;
            BigDecimal delta=s.config().deviationBasis()==DeviationBasis.A?da:dw;
            BigDecimal under=delta==null?null:delta.negate().max(BigDecimal.ZERO),over=delta==null?null:delta.max(BigDecimal.ZERO);
            if(delta!=null)deviation=deviation.add(delta.abs());
            loads.add(new Load(t.id(),w.base(),w.reduction(),w.targetApplicable()?q:null,a,w.fixedOutside(),w.converted(),all,da,dw,under,over,w.targetApplicable()));
            for(HardCheck check:t.hardChecks()) {
                BigDecimal value=null;CheckStatus status=check.dataStatus();
                if(status==CheckStatus.PASS) {
                    value=check.fixed().add(check.converted());
                    for(Demand d:s.demands())if(t.id().equals(assignments.get(d.id())))value=value.add(check.coefficients().get(d.id()));
                    status=value.compareTo(check.limit())<=0?CheckStatus.PASS:CheckStatus.VIOLATION;
                    require(status!=CheckStatus.VIOLATION,"solution."+t.id()+"."+check.id(),"Hard limit violated");
                }
                checks.add(new CheckResult(t.id(),check.id(),check.ruleId(),check.period(),check.calculationPeriod(),check.unit(),status,value,check.limit(),check.missingData()));
            }
        }
        int complete=0;for(List<Integer> group:p.groups())if(group.stream().allMatch(j->assignments.get(s.demands().get(j).id())!=null))complete++;
        BigDecimal missing=total.subtract(assigned);long coverage=switch(s.config().coverageMode()) {case COMPONENTS->s.demands().size()-count;case PERIODS->scaled(missing,p.scale(),"coverage");case COMPLETE_GROUPS->p.groups().size()-complete;};
        long soft=plus(times(s.config().loadWeight(),scaled(deviation,p.scale(),"deviation")),plus(times(times(s.config().experienceWeight(),p.scale()),exp),times(times(s.config().changeWeight(),p.scale()),changes)));
        Metrics metrics=new Metrics(s.demands().size(),count,s.demands().size()-count,total,assigned,missing,p.groups().size(),complete,p.groups().size()-complete,deviation,exp,changes,added,removed,coverage,soft,coverageProven && coverage>0);
        return new Evaluation(List.copyOf(loads),List.copyOf(checks),metrics);
    }

    List<Assignment> explain(Snapshot s,Map<String,String> map) {
        Prepared p=new InputValidator().validate(s);List<Assignment> result=new ArrayList<>();
        for(Demand d:s.demands()) {
            String teacher=map.get(d.id()),code=null,reason=null;List<String> evidence=new ArrayList<>();
            if(teacher==null) {
                int j=p.demandIndex().get(d.id());List<Teacher> eligible=new ArrayList<>();for(int i=0;i<s.teachers().size();i++)if(p.eligible()[i][j])eligible.add(s.teachers().get(i));
                if(eligible.isEmpty()) {code="NO_QUALIFIED_TEACHER";reason="Không có ứng viên đã xác nhận đủ chuyên môn và công tác trong snapshot này.";}
                else {
                    String fixed=s.demands().stream().filter(v->v.groupKey().equals(d.groupKey())).map(v->map.get(v.id())).filter(Objects::nonNull).findFirst().orElse(null);
                    boolean allCapacity=true,anyCompatible=false;
                    for(Teacher t:eligible) {
                        if(fixed!=null && !fixed.equals(t.id())) { evidence.add(t.id()+": SAME_TEACHER_GROUP (current assignment)");continue; }
                        anyCompatible=true;boolean blocked=false;
                        for(HardCheck check:t.hardChecks())if(check.dataStatus()==CheckStatus.PASS) {
                            BigDecimal value=check.fixed().add(check.converted()).add(check.coefficients().get(d.id()));
                            for(Demand other:s.demands())if(t.id().equals(map.get(other.id())))value=value.add(check.coefficients().get(other.id()));
                            if(value.compareTo(check.limit())>0){blocked=true;evidence.add(t.id()+": "+check.id()+" would be "+value+" > "+check.limit()+" "+check.unit());}
                        }
                        allCapacity &= blocked;
                    }
                    if(anyCompatible && allCapacity){code="CAPACITY_EXCEEDED";reason="Không thể gán thêm trực tiếp vào nghiệm hiện tại với các giới hạn đã kiểm tra; chưa chứng minh không có phương án đổi gán khác.";}
                    else {code="UNRESOLVED";reason="Chưa xác định đầy đủ nguyên nhân riêng của nhu cầu; xem ràng buộc nhóm và chất lượng từng pha. Không suy thiếu GV từ timeout.";}
                }
            }
            result.add(new Assignment(d.id(),d.classId(),d.subjectId(),d.type(),d.periods(),teacher,code,reason,evidence));
        }
        return List.copyOf(result);
    }
}
