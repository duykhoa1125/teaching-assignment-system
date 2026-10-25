package vn.edu.tass.solver;

import static vn.edu.tass.solver.Contract.*;
import java.math.*;
import java.time.LocalDate;
import java.util.*;

public final class InputValidator {
    // Deliberately below 2^53: exported double bounds remain exact for integer test objectives.
    static final long SAFE = 1_000_000_000_000L;
    public static final class InvalidInput extends IllegalArgumentException {
        private final List<Issue> issues;
        InvalidInput(String path, String message) { super(path + ": " + message); issues=List.of(new Issue("INVALID_INPUT",path,message)); }
        public List<Issue> issues() { return issues; }
    }
    static void require(boolean condition, String path, String message) { if (!condition) throw new InvalidInput(path,message); }
    static void text(String value, String path) { require(value!=null && !value.isBlank() && !value.contains("\u001f"),path,"Required nonblank value (no group separator)"); }
    static long bounded(long value, String path) { require(value>=0 && value<=SAFE,path,"Outside safe integer domain"); return value; }
    static long plus(long a,long b) { try { return bounded(Math.addExact(a,b),"normalization"); } catch(ArithmeticException e) { throw new InvalidInput("normalization","Sum overflow"); } }
    static long times(long a,long b) { try { return bounded(Math.multiplyExact(a,b),"objective"); } catch(ArithmeticException e) { throw new InvalidInput("objective","Product overflow"); } }
    static long scaled(BigDecimal n,long scale,String path) {
        require(n!=null,path,"Missing number; unknown is not zero");
        try { return bounded(n.multiply(BigDecimal.valueOf(scale)).longValueExact(),path); }
        catch(ArithmeticException e) { throw new InvalidInput(path,"Not exactly representable at integerScale, or overflow"); }
    }
    static boolean covers(LocalDate from,LocalDate to,Period p) { return !from.isAfter(p.startsOn()) && !to.isBefore(p.endsOn()); }
    static void dates(LocalDate from,LocalDate to,String path) { require(from!=null && to!=null && !from.isAfter(to),path,"Invalid effective dates"); }
    public record Prepared(Snapshot input, long scale, long[] hours, long[] b, long[] r, long[] q,
                           long[] f, long[] c, boolean[][] eligible, List<List<Integer>> groups,
                           Map<String,Integer> demandIndex, Map<String,Integer> teacherIndex) {}

    public Prepared validate(Snapshot s) {
        require(s!=null,"snapshot","Required");
        require("tass-solver/1".equals(s.schemaVersion()),"schemaVersion","Expected tass-solver/1");
        Identity id=s.identity(); require(id!=null,"identity","Required");
        text(id.schoolId(),"identity.schoolId"); text(id.semesterId(),"identity.semesterId");
        text(id.roundId(),"identity.roundId"); text(id.planId(),"identity.planId"); text(id.versionId(),"identity.versionId");
        text(id.snapshotId(),"identity.snapshotId"); text(id.sourceRevisionToken(),"identity.sourceRevisionToken");
        text(id.ruleSetVersion(),"identity.ruleSetVersion"); text(id.optimizationConfigVersion(),"identity.optimizationConfigVersion");
        require(id.baseRevision()>=0 && id.baseRevision()<Long.MAX_VALUE,"identity.baseRevision","Invalid revision");
        require(s.period()!=null,"period","Required"); dates(s.period().startsOn(),s.period().endsOn(),"period");
        Normalization n=s.normalization(); require(n!=null,"normalization","Required");
        require(n.integerScale()>0 && n.integerScale()<=1_000_000,"integerScale","Use exact scale between 1 and 1000000");
        require("PERIODS_PER_WEEK".equals(n.unit()),"normalization.unit","Workload unit must be PERIODS_PER_WEEK");
        require(n.basis()!=null,"normalization.basis","Required");
        require("EXACT".equals(n.roundingRule()),"roundingRule","Only EXACT supported; apply approved business rounding upstream with evidence");
        Config cfg=s.config(); require(cfg!=null,"config","Required");
        require(cfg.coverageMode()!=null && cfg.deviationBasis()!=null && cfg.preservePolicy()!=null,"config","Explicit objective policies required");
        bounded(cfg.loadWeight(),"loadWeight"); bounded(cfg.experienceWeight(),"experienceWeight"); bounded(cfg.changeWeight(),"changeWeight");
        require(cfg.loadWeight()>0 || cfg.experienceWeight()>0 || cfg.changeWeight()>0,"config.weights","At least one nonzero weight required");
        require(cfg.preservePolicy()!=PreservePolicy.REOPTIMIZE || cfg.changeWeight()==0,"changeWeight","REOPTIMIZE requires zero change weight");
        require(cfg.preservePolicy()!=PreservePolicy.PENALIZE_CHANGES || cfg.changeWeight()>0,"changeWeight","PENALIZE_CHANGES requires positive weight");
        require(Double.isFinite(cfg.totalSeconds()) && cfg.totalSeconds()>0 && cfg.totalSeconds()<=3600,"totalSeconds","Must be finite, >0 and <=3600");
        require(Double.isFinite(cfg.phaseOneSeconds()) && cfg.phaseOneSeconds()>0 && Double.isFinite(cfg.phaseTwoSeconds()) && cfg.phaseTwoSeconds()>=0,"phaseSeconds","Invalid phase budgets");
        require(cfg.workers()>0 && cfg.workers()<=64 && cfg.seed()>=0,"run","Invalid workers or seed"); text(cfg.decisionSource(),"config.decisionSource");
        text(s.hardCheckInventorySource(),"hardCheckInventorySource");
        Map<String,Precheck> pre=new HashMap<>();
        for(Precheck p:s.prechecks()) { text(p.ruleId(),"precheck.ruleId"); require(pre.put(p.ruleId(),p)==null,"prechecks","Duplicate rule"); text(p.source(),"precheck.source"); text(p.explanation(),"precheck.explanation");
            require(p.status()==CheckStatus.PASS || p.status()==CheckStatus.NOT_APPLICABLE,"prechecks."+p.ruleId(),"Required rule service check failed or lacks data"); }
        for(String rule:List.of("BR-04","BR-16","BR-17","BR-18","BR-19","BR-20","BR-21")) require(pre.containsKey(rule),"prechecks", "Missing rule-service evidence for "+rule);
        Map<String,Scope> scopes=new LinkedHashMap<>();Map<String,Scope> classes=new HashMap<>();
        for(Scope sc:s.scopes()) {
            text(sc.classId(),"scope.classId");text(sc.subjectId(),"scope.subjectId");text(sc.className(),"scope.className");text(sc.subjectName(),"scope.subjectName");text(sc.gradeId(),"scope.gradeId");text(sc.levelId(),"scope.levelId");text(sc.confirmationSource(),"scope.confirmationSource");
            require(scopes.put(sc.key(),sc)==null,"scopes","Duplicate class-subject scope");
            Scope sameClass=classes.putIfAbsent(sc.classId(),sc);
            require(sameClass==null || sameClass.gradeId().equals(sc.gradeId()) && sameClass.levelId().equals(sc.levelId()) && sameClass.className().equals(sc.className()),"scopes","Inconsistent grade/level/name for same class");
            require(sc.status()!=null && sc.status()!=Applicability.UNDETERMINED,"scope.status","Unresolved applicability blocks solving");
            require(new HashSet<>(sc.requiredTypes()).size()==sc.requiredTypes().size(),"scope.requiredTypes","Duplicate types");
            require((sc.status()==Applicability.APPLICABLE)==!sc.requiredTypes().isEmpty(),"scope.requiredTypes","APPLICABLE needs confirmed components; NOT_APPLICABLE must be empty");
        }
        int dc=s.demands().size(),tc=s.teachers().size();
        long scale=n.integerScale(); long[] h=new long[dc],b=new long[tc],r=new long[tc],q=new long[tc],f=new long[tc],c=new long[tc];
        Map<String,Integer> di=new LinkedHashMap<>(),ti=new LinkedHashMap<>(); Map<String,List<Integer>> groups=new LinkedHashMap<>(); Set<String> tuples=new HashSet<>();
        long total=0;
        for(int j=0;j<dc;j++) {
            Demand d=s.demands().get(j);text(d.id(),"demand.id");text(d.source(),"demand.source");
            require(di.put(d.id(),j)==null,"demands","Duplicate demand id");
            require(id.semesterId().equals(d.semesterId()),"demand.semesterId","Wrong semester");
            Scope sc=scopes.get(d.groupKey());require(sc!=null && sc.status()==Applicability.APPLICABLE,"demand.scope","Not in confirmed applicable scope");
            require(d.type()!=null && sc.requiredTypes().contains(d.type()),"demand.type","Unconfirmed component");
            require(tuples.add(d.groupKey()+"\u001f"+d.type()),"demands","Duplicate class-subject-semester-type");
            h[j]=scaled(d.periods(),scale,"demand."+d.id()+".periods"); require(h[j]>0,"demand.periods","Must be positive");total=plus(total,h[j]);
            groups.computeIfAbsent(d.groupKey(),k->new ArrayList<>()).add(j);
        }
        for(Scope sc:s.scopes()) for(DemandType t:sc.requiredTypes()) require(tuples.contains(sc.key()+"\u001f"+t),"scope."+sc.key(),"Missing required component "+t+"; include entire group in optimization scope");
        boolean[][] eligible=new boolean[tc][dc]; long softBound=0;
        for(int i=0;i<tc;i++) {
            Teacher t=s.teachers().get(i);text(t.id(),"teacher.id");text(t.name(),"teacher.name");require(ti.put(t.id(),i)==null,"teachers","Duplicate teacher");
            boolean active=false; List<Employment> current=new ArrayList<>();
            for(Employment e:t.employments()) {
                dates(e.startsOn(),e.endsOn(),"employment");text(e.schoolId(),"employment.schoolId");text(e.semesterId(),"employment.semesterId");text(e.source(),"employment.source");require(e.status()!=null,"employment.status","Required");
                if(e.semesterId().equals(id.semesterId())) {
                    require(!e.startsOn().isBefore(s.period().startsOn()) && !e.endsOn().isAfter(s.period().endsOn()),"employment","Interval must be inside semester");
                    for(Employment other:current) require(e.endsOn().isBefore(other.startsOn()) || e.startsOn().isAfter(other.endsOn()),"employment","Overlapping employment intervals");current.add(e);
                    require(covers(e.startsOn(),e.endsOn(),s.period()),"employment","Partial-term employment/leave needs approved segmentation; unsupported in this version");
                    active=e.schoolId().equals(id.schoolId()) && e.status()==EmploymentStatus.ACTIVE;
                }
            }
            for(Qualification z:t.qualifications()) { dates(z.startsOn(),z.endsOn(),"qualification");text(z.subjectId(),"qualification.subjectId");text(z.levelId(),"qualification.levelId"); if(z.verified()) text(z.source(),"qualification.source"); }
            Workload w=t.workload();require(w!=null,"teacher.workload","Required");text(w.source(),"workload.source");text(w.selectedBaseline(),"workload.selectedBaseline");
            require(active || !w.targetApplicable(),"workload.targetApplicable","No active employment: target must be not applicable");
            b[i]=scaled(w.base(),scale,"workload.base");r[i]=scaled(w.reduction(),scale,"workload.reduction");q[i]=Math.max(0,b[i]-r[i]);f[i]=scaled(w.fixedOutside(),scale,"workload.fixedOutside");c[i]=scaled(w.converted(),scale,"workload.converted");
            require(new HashSet<>(w.outsideDemandIds()).size()==w.outsideDemandIds().size(),"outsideDemandIds","Duplicate outside demand");
            for(String out:w.outsideDemandIds()) {text(out,"outsideDemandIds");require(!di.containsKey(out),"outsideDemandIds","F overlaps A: "+out);}
            for(int j=0;j<dc;j++) {
                Demand d=s.demands().get(j);Scope sc=scopes.get(d.groupKey());
                eligible[i][j]=active && t.qualifications().stream().anyMatch(z->z.verified() && z.subjectId().equals(d.subjectId()) && z.levelId().equals(sc.levelId()) && covers(z.startsOn(),z.endsOn(),s.period()));
                if(eligible[i][j]) {Long penalty=t.experiencePenalties().get(d.id());require(penalty!=null,"experiencePenalties."+d.id(),"Explicit penalty required for each eligible pair, including configured missing-experience penalty");bounded(penalty,"experiencePenalty");softBound=plus(softBound,times(times(cfg.experienceWeight(),scale),penalty));}
            }
            for(String key:t.experiencePenalties().keySet()) require(di.containsKey(key),"experiencePenalties","Unknown demand "+key);
            Set<String> checkIds=new HashSet<>(); boolean weekly=false,annual=false;
            for(HardCheck check:t.hardChecks()) {
                text(check.id(),"check.id");require(checkIds.add(check.id()),"hardChecks","Duplicate check");text(check.ruleId(),"check.ruleId");text(check.source(),"check.source");text(check.unit(),"check.unit");text(check.calculationPeriod(),"check.calculationPeriod");
                require(check.period()!=null && check.dataStatus()!=null,"check","Missing period/status");
                weekly|=check.period()==CheckPeriod.WEEKLY && check.dataStatus()==CheckStatus.PASS;annual|=check.period()==CheckPeriod.ANNUAL;
                if(check.dataStatus()==CheckStatus.INSUFFICIENT_DATA) { require(check.period()==CheckPeriod.ANNUAL,"hardChecks."+check.id(),"Missing mandatory weekly data");require(!check.missingData().isEmpty(),"missingData","Describe missing annual data");continue; }
                if(check.dataStatus()==CheckStatus.NOT_APPLICABLE) continue;
                require(check.dataStatus()==CheckStatus.PASS,"hardChecks."+check.id(),"Rule input is already a confirmed violation");
                require(check.coefficients().keySet().equals(di.keySet()),"hardChecks."+check.id()+".coefficients","Explicit coefficient for EVERY demand required, including zeros");
                long max=plus(scaled(check.fixed(),scale,"check.fixed"),scaled(check.converted(),scale,"check.converted"));
                for(BigDecimal value:check.coefficients().values()) max=plus(max,scaled(value,scale,"check.coefficient"));scaled(check.limit(),scale,"check.limit");
            }
            require(weekly && annual,"hardChecks","Each teacher needs complete weekly check and explicit annual check/status");
            if(w.targetApplicable()) softBound=plus(softBound,times(cfg.loadWeight(),plus(q[i],plus(total,plus(f[i],c[i])))));
        }
        Set<String> oldIds=new HashSet<>();
        for(PreviousAssignment old:s.previousAssignments()) {text(old.demandId(),"previous.demandId");require(oldIds.add(old.demandId()),"previousAssignments","Duplicate demand");if(old.teacherId()!=null)text(old.teacherId(),"previous.teacherId");}
        if(!s.previousAssignments().isEmpty()) text(s.previousSource(),"previousSource");
        softBound=plus(softBound,times(times(cfg.changeWeight(),scale),dc));
        return new Prepared(s,scale,h,b,r,q,f,c,eligible,groups.values().stream().map(List::copyOf).toList(),Collections.unmodifiableMap(di),Collections.unmodifiableMap(ti));
    }
}
