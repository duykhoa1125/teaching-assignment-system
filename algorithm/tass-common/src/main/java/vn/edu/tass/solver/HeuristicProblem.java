package vn.edu.tass.solver;

import static vn.edu.tass.solver.Contract.*;
import static vn.edu.tass.solver.InputValidator.*;
import java.util.*;
import java.util.function.BooleanSupplier;

/** Feasible decoder and exact lexicographic score shared by Greedy and GA. No CP-SAT calls. */
public final class HeuristicProblem {
    public record Score(long coverage,long l1,long maximum,long experience,long changes) implements Comparable<Score> {
        public List<Long> vector(){return List.of(coverage,l1,maximum,experience,changes);}
        public long soft(){return l1;} // Legacy diagnostic column, never a weighted ranking.
        public int compareTo(Score other) {
            int c=Long.compare(coverage,other.coverage);if(c!=0)return c;
            c=Long.compare(l1,other.l1);if(c!=0)return c;
            c=Long.compare(maximum,other.maximum);if(c!=0)return c;
            c=Long.compare(experience,other.experience);return c!=0?c:Long.compare(changes,other.changes);
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
    private final int[][] candidateIds;
    private final Map<String,String> previous=new HashMap<>();

    public HeuristicProblem(Snapshot snapshot) {
        prepared=new InputValidator().validate(snapshot);input=snapshot;
        groupOf=new int[demandCount()];experience=new long[teacherCount()][demandCount()];
        candidateIds=new int[demandCount()][];
        for(int j=0;j<demandCount();j++){final int demand=j;candidateIds[j]=java.util.stream.IntStream.range(0,teacherCount()).filter(i->prepared.eligible()[i][demand]).toArray();}
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
            for(int j=0;j<demandCount();j++)if(prepared.eligible()[i][j]) { Demand demand=input.demands().get(j);Scope scope=input.scopes().stream().filter(sc->sc.key().equals(demand.groupKey())).findFirst().orElseThrow();experience[i][j]=times(input.config().gradeWeight(scope.gradeId()),teacher.experiencePenalties().get(demand.id())); }
        }
        input.previousAssignments().forEach(a->previous.put(a.demandId(),a.teacherId()));
    }
    public int demandCount() { return input.demands().size(); }
    public int teacherCount() { return input.teachers().size(); }
    public int[] candidates(int demand) {
        return candidateIds[demand].clone();
    }
    /** Most constrained first, then largest contribution to the configured primary objective. */
    public int[] greedyOrder() {
        Integer[] order=new Integer[demandCount()];for(int j=0;j<order.length;j++)order[j]=j;
        Arrays.sort(order,Comparator.comparingInt((Integer j)->candidateIds[j].length)
            .thenComparing(Comparator.comparingLong((Integer j)->input.config().coverageMode()==CoverageMode.PERIODS?prepared.hours()[j]:0).reversed())
            .thenComparing(j->input.demands().get(j).id()));
        return Arrays.stream(order).mapToInt(Integer::intValue).toArray();
    }
    /** preference: -2=leave unassigned, -1=best local soft score, >=0=try that teacher first. */
    public Candidate decode(int[] order, int[] preferences, BooleanSupplier stop) {
        int[] assignment=new int[demandCount()];
        Arrays.fill(assignment,-1);
        long[][] current=new long[teacherCount()][];
        for(int i=0;i<teacherCount();i++){current[i]=new long[limits.get(i).size()];for(int r=0;r<current[i].length;r++)current[i][r]=limits.get(i).get(r).base();}
        for(LockedAssignment lock:input.lockedAssignments()) {
            int j=prepared.demandIndex().get(lock.demandId()),i=prepared.teacherIndex().get(lock.teacherId());
            assignment[j]=i;
            for(int r=0;r<current[i].length;r++)current[i][r]+=limits.get(i).get(r).coefficient()[j];
        }
        for(int j:order) {
            if(assignment[j]>=0)continue;
            if(stop.getAsBoolean())break;
            if(preferences[j]==-2)continue;
            int selected=-1;Score bestScore=null;
            for(int i:candidateIds[j]) {
                boolean fits=true;
                for(int r=0;r<current[i].length;r++)if(current[i][r]+limits.get(i).get(r).coefficient()[j]>limits.get(i).get(r).maximum()){fits=false;break;}
                if(!fits)continue;
                if(preferences[j]==i){selected=i;break;}
                assignment[j]=i;Score score=score(assignment);assignment[j]=-1;
                if(bestScore==null || score.compareTo(bestScore)<0 || score.compareTo(bestScore)==0 && input.teachers().get(i).id().compareTo(input.teachers().get(selected).id())<0){bestScore=score;selected=i;}
            }
            if(selected>=0) {
                assignment[j]=selected;
                for(int r=0;r<current[selected].length;r++)current[selected][r]+=limits.get(selected).get(r).coefficient()[j];
            }
        }
        return new Candidate(assignment,score(assignment));
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
        long deviation=0,maximum=0;
        for(int i=0;i<teacherCount();i++)if(input.teachers().get(i).workload().targetApplicable()) {
            long value=a[i]+prepared.f()[i]+prepared.c()[i]+prepared.r()[i];
            long delta=Math.abs(value-prepared.b()[i]);deviation+=delta;maximum=Math.max(maximum,delta);
        }
        return new Score(coverage,deviation,maximum,exp,input.config().preservePolicy()==PreservePolicy.PENALIZE_CHANGES?changes:0);
    }
    public Map<String,String> toAssignments(Candidate candidate) {
        Map<String,String> result=new LinkedHashMap<>();int[] assignment=candidate.assignment();
        for(int j=0;j<demandCount();j++)result.put(input.demands().get(j).id(),assignment[j]<0?null:input.teachers().get(assignment[j]).id());
        return result;
    }
}
