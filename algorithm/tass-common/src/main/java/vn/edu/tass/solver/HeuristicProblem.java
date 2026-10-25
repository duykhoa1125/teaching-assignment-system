package vn.edu.tass.solver;

import static vn.edu.tass.solver.Contract.*;
import static vn.edu.tass.solver.InputValidator.*;
import java.util.*;
import java.util.function.BooleanSupplier;

/** Feasible decoder and exact lexicographic score shared by Greedy and GA. No CP-SAT calls. */
public final class HeuristicProblem {
    public record Score(long coverage, long soft) implements Comparable<Score> {
        public int compareTo(Score other) {
            int primary=Long.compare(coverage,other.coverage);
            return primary!=0?primary:Long.compare(soft,other.soft);
        }
    }
    public record Candidate(int[] assignment, Score score) {
        public Candidate { assignment=assignment.clone(); }
        public int[] assignment() { return assignment.clone(); }
    }
    public static final class BaselineViolation extends IllegalArgumentException {
        BaselineViolation(String message) { super(message); }
    }
    private record Limit(long base, long maximum, long[] coefficient) {}
    private final Prepared prepared;
    private final Snapshot input;
    private final int[] groupOf;
    private final List<List<Limit>> limits=new ArrayList<>();
    private final long[][] experience;
    private final Map<String,String> previous=new HashMap<>();

    public HeuristicProblem(Snapshot snapshot) {
        prepared=new InputValidator().validate(snapshot);input=snapshot;
        groupOf=new int[demandCount()];experience=new long[teacherCount()][demandCount()];
        for(int k=0;k<prepared.groups().size();k++)for(int j:prepared.groups().get(k))groupOf[j]=k;
        for(int i=0;i<teacherCount();i++) {
            Teacher teacher=input.teachers().get(i);List<Limit> rows=new ArrayList<>();
            for(HardCheck check:teacher.hardChecks())if(check.dataStatus()==CheckStatus.PASS) {
                long fixed=plus(scaled(check.fixed(),prepared.scale(),"fixed"),scaled(check.converted(),prepared.scale(),"converted"));
                long max=scaled(check.limit(),prepared.scale(),"limit");
                if(fixed>max)throw new BaselineViolation(teacher.id()+" / "+check.id()+": fixed+converted exceeds hard limit even with every demand unassigned");
                long[] coefficients=new long[demandCount()];
                for(int j=0;j<demandCount();j++)coefficients[j]=scaled(check.coefficients().get(input.demands().get(j).id()),prepared.scale(),"coefficient");
                rows.add(new Limit(fixed,max,coefficients));
            }
            limits.add(List.copyOf(rows));
            for(int j=0;j<demandCount();j++)if(prepared.eligible()[i][j])experience[i][j]=teacher.experiencePenalties().get(input.demands().get(j).id());
        }
        input.previousAssignments().forEach(a->previous.put(a.demandId(),a.teacherId()));
    }
    public int demandCount() { return input.demands().size(); }
    public int teacherCount() { return input.teachers().size(); }
    public int[] candidates(int demand) {
        return java.util.stream.IntStream.range(0,teacherCount()).filter(i->prepared.eligible()[i][demand]).toArray();
    }
    /** Most constrained first, then largest contribution to the configured primary objective. */
    public int[] greedyOrder() {
        Integer[] order=new Integer[demandCount()];for(int j=0;j<order.length;j++)order[j]=j;
        Arrays.sort(order,Comparator.comparingInt((Integer j)->candidates(j).length)
            .thenComparing(Comparator.comparingLong((Integer j)->input.config().coverageMode()==CoverageMode.PERIODS?prepared.hours()[j]:0).reversed())
            .thenComparing(j->input.demands().get(j).id()));
        return Arrays.stream(order).mapToInt(Integer::intValue).toArray();
    }
    /** preference: -2=leave unassigned, -1=best local soft score, >=0=try that teacher first. */
    public Candidate decode(int[] order, int[] preferences, BooleanSupplier stop) {
        int[] assignment=new int[demandCount()],groupTeacher=new int[prepared.groups().size()];
        Arrays.fill(assignment,-1);Arrays.fill(groupTeacher,-1);
        long[] a=new long[teacherCount()];long[][] current=new long[teacherCount()][];
        for(int i=0;i<teacherCount();i++){current[i]=new long[limits.get(i).size()];for(int r=0;r<current[i].length;r++)current[i][r]=limits.get(i).get(r).base();}
        for(int j:order) {
            if(stop.getAsBoolean())break;
            if(preferences[j]==-2)continue;
            int selected=-1;long bestDelta=Long.MAX_VALUE;
            for(int i:candidates(j)) {
                if(groupTeacher[groupOf[j]]>=0 && groupTeacher[groupOf[j]]!=i)continue;
                boolean fits=true;
                for(int r=0;r<current[i].length;r++)if(current[i][r]+limits.get(i).get(r).coefficient()[j]>limits.get(i).get(r).maximum()){fits=false;break;}
                if(!fits)continue;
                if(preferences[j]==i){selected=i;break;}
                long delta=localSoftDelta(i,j,a[i]);
                if(delta<bestDelta || delta==bestDelta && (selected<0 || input.teachers().get(i).id().compareTo(input.teachers().get(selected).id())<0)){bestDelta=delta;selected=i;}
            }
            if(selected>=0) {
                assignment[j]=selected;groupTeacher[groupOf[j]]=selected;a[selected]+=prepared.hours()[j];
                for(int r=0;r<current[selected].length;r++)current[selected][r]+=limits.get(selected).get(r).coefficient()[j];
            }
        }
        return new Candidate(assignment,score(assignment));
    }
    private long localSoftDelta(int i,int j,long assigned) {
        Config cfg=input.config();long delta=cfg.experienceWeight()*prepared.scale()*experience[i][j];
        if(input.teachers().get(i).workload().targetApplicable()) {
            long fixed=cfg.deviationBasis()==DeviationBasis.W?prepared.f()[i]+prepared.c()[i]:0;
            delta+=cfg.loadWeight()*(Math.abs(assigned+fixed+prepared.hours()[j]-prepared.q()[i])-Math.abs(assigned+fixed-prepared.q()[i]));
        }
        String id=input.demands().get(j).id();
        if(previous.containsKey(id)) {
            String old=previous.get(id),teacher=input.teachers().get(i).id();
            delta+=cfg.changeWeight()*prepared.scale()*((Objects.equals(old,teacher)?0:1)-(old==null?0:1));
        }
        return delta;
    }
    public Score score(int[] assignment) {
        long coverage=0,exp=0,changes=0;long[] a=new long[teacherCount()];boolean[] incomplete=new boolean[prepared.groups().size()];
        for(int j=0;j<demandCount();j++) {
            int i=assignment[j];String teacher=null;
            if(i<0) {incomplete[groupOf[j]]=true;if(input.config().coverageMode()!=CoverageMode.COMPLETE_GROUPS)coverage+=input.config().coverageMode()==CoverageMode.PERIODS?prepared.hours()[j]:1;}
            else {a[i]+=prepared.hours()[j];exp+=experience[i][j];teacher=input.teachers().get(i).id();}
            String id=input.demands().get(j).id();if(previous.containsKey(id) && !Objects.equals(previous.get(id),teacher))changes++;
        }
        if(input.config().coverageMode()==CoverageMode.COMPLETE_GROUPS)for(boolean missing:incomplete)if(missing)coverage++;
        long deviation=0;
        for(int i=0;i<teacherCount();i++)if(input.teachers().get(i).workload().targetApplicable()) {
            long value=a[i]+(input.config().deviationBasis()==DeviationBasis.W?prepared.f()[i]+prepared.c()[i]:0);
            deviation+=Math.abs(value-prepared.q()[i]);
        }
        Config cfg=input.config();return new Score(coverage,cfg.loadWeight()*deviation+cfg.experienceWeight()*prepared.scale()*exp+cfg.changeWeight()*prepared.scale()*changes);
    }
    public Map<String,String> toAssignments(Candidate candidate) {
        Map<String,String> result=new LinkedHashMap<>();int[] assignment=candidate.assignment();
        for(int j=0;j<demandCount();j++)result.put(input.demands().get(j).id(),assignment[j]<0?null:input.teachers().get(assignment[j]).id());
        return result;
    }
}
