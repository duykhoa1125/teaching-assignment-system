package vn.edu.tass.solver;

import com.google.ortools.Loader;
import com.google.ortools.sat.*;
import static vn.edu.tass.solver.Contract.*;
import static vn.edu.tass.solver.InputValidator.*;
import java.util.*;

public final class AssignmentSolver {
    public static final String ORTOOLS_VERSION="9.14.6206";
    record PhaseRun(Phase metadata,Map<String,String> assignments) {}
    interface Backend {PhaseRun run(ModelBuilder.Built model,Prepared input,String phase,double seconds,Cancellation cancellation);}
    private final Backend backend;
    public AssignmentSolver(){this(new NativeBackend());}
    AssignmentSolver(Backend backend){this.backend=backend;}
    public Result solve(Snapshot snapshot){return solve(snapshot,new Cancellation());}
    public Result solve(Snapshot s,Cancellation cancel) {
        long started=System.nanoTime();List<Phase> phases=new ArrayList<>();ModelBuilder.Built built=null;
        try {
            Prepared p=new InputValidator().validate(s);
            if(cancel.isCancelled())return empty(s,"CANCELLED",List.of(),phases,started,null);
            built=new ModelBuilder().build(p);String invalid=built.model().validate();
            if(!invalid.isEmpty())return empty(s,"MODEL_INVALID",List.of(new Issue("MODEL_INVALID","model",invalid)),phases,started,built);
            double remaining=remaining(s,started);
            if(remaining<=0)return empty(s,"UNKNOWN",List.of(new Issue("TIME_LIMIT","run","Budget exhausted before search")),phases,started,built);
            built.model().minimize(built.coverage());
            PhaseRun one=backend.run(built,p,"COVERAGE",Math.min(remaining,s.config().phaseOneSeconds()),cancel);phases.add(one.metadata());
            if(cancel.isCancelled())return empty(s,"CANCELLED",List.of(),phases,started,built);
            if(one.assignments()==null)return empty(s,one.metadata().status(),List.of(),phases,started,built);
            SolutionValidator validator=new SolutionValidator();
            var first=validator.evaluate(s,one.assignments(),one.metadata().exactOptimalityProven());
            require(Objects.equals(one.metadata().objective(),first.metrics().coverageObjective()),"phaseOne","Independent objective mismatch");
            PhaseRun selected=one;boolean softProof=false;
            built.model().addEquality(built.coverage(),first.metrics().coverageObjective());
            built.model().minimize(built.soft());
            for(int j=0;j<s.demands().size();j++) {
                String teacher=one.assignments().get(s.demands().get(j).id());built.model().addHint(built.y()[j],teacher==null?1:0);
                for(int i=0;i<s.teachers().size();i++)if(built.x()[i][j]!=null)built.model().addHint(built.x()[i][j],s.teachers().get(i).id().equals(teacher)?1:0);
            }
            remaining=remaining(s,started);
            if(remaining>0 && s.config().phaseTwoSeconds()>0) {
                PhaseRun two=backend.run(built,p,"SOFT",Math.min(remaining,s.config().phaseTwoSeconds()),cancel);phases.add(two.metadata());
                if(cancel.isCancelled())return empty(s,"CANCELLED",List.of(),phases,started,built);
                if(two.assignments()!=null) {
                    var second=validator.evaluate(s,two.assignments(),one.metadata().exactOptimalityProven());
                    require(second.metrics().coverageObjective()==first.metrics().coverageObjective(),"phaseTwo","Coverage changed");
                    require(Objects.equals(two.metadata().objective(),second.metrics().softObjective()),"phaseTwo","Independent soft objective mismatch");
                    if(second.metrics().softObjective()<=first.metrics().softObjective()){selected=two;softProof=two.metadata().exactOptimalityProven();}
                }
            } else phases.add(new Phase("SOFT","NOT_RUN",remaining<=0?"TOTAL_BUDGET_EXHAUSTED":"PHASE_DISABLED",null,null,0,false));
            boolean coverageProof=one.metadata().exactOptimalityProven();
            var verified=validator.evaluate(s,selected.assignments(),coverageProof);
            if(cancel.isCancelled())return empty(s,"CANCELLED",List.of(),phases,started,built);
            List<String> warnings=warnings(s,verified.checks());
            if(!softProof)warnings.add("Soft objective is not proven optimal; retained best independently validated incumbent.");
            double elapsed=seconds(started);
            return new Result(coverageProof && softProof?"OPTIMAL":"FEASIBLE",s.identity(),Json.hash(s),List.of(),validator.explain(s,selected.assignments()),verified.loads(),verified.checks(),verified.metrics(),phases,selected.metadata().name(),coverageProof,softProof,verified.metrics().unassignedComponents()==0,warnings,elapsed,elapsed>s.config().totalSeconds(),ORTOOLS_VERSION,built.model().model().getVariablesCount(),built.model().model().getConstraintsCount());
        } catch(InvalidInput ex) {return empty(s,built==null?"INVALID_INPUT":"VALIDATION_FAILED",ex.issues(),phases,started,built);}
        catch(RuntimeException ex) {return empty(s,"ERROR",List.of(new Issue("RUN_ERROR","solver",ex.getClass().getSimpleName()+": "+ex.getMessage())),phases,started,built);}
    }
    private static List<String> warnings(Snapshot s,List<CheckResult> checks) {
        List<String> result=new ArrayList<>();if(s.config().demoAssumptions())result.add("DEMO ASSUMPTIONS: "+s.config().decisionSource()+". Not an approved production rule set.");
        for(CheckResult check:checks)if(check.status()==CheckStatus.INSUFFICIENT_DATA)result.add("INSUFFICIENT_DATA "+check.teacherId()+" / "+check.checkId()+": "+String.join(", ",check.missingData()));
        result.add("dataReadyForOpening covers data checks only; lifecycle, authorization, fresh revision/token and feedback guards remain Assignment Service responsibilities.");return result;
    }
    private static Result empty(Snapshot s,String status,List<Issue> errors,List<Phase> phases,long started,ModelBuilder.Built built) {
        double elapsed=seconds(started);return new Result(status,s==null?null:s.identity(),s==null?null:Json.hash(s),errors,List.of(),List.of(),List.of(),null,phases,null,false,false,false,List.of(),elapsed,s!=null && s.config()!=null && elapsed>s.config().totalSeconds(),ORTOOLS_VERSION,built==null?0:built.model().model().getVariablesCount(),built==null?0:built.model().model().getConstraintsCount());
    }
    private static double seconds(long start){return (System.nanoTime()-start)/1e9;}
    private static double remaining(Snapshot s,long started){return s.config().totalSeconds()-seconds(started);}
    static final class NativeBackend implements Backend {
        NativeBackend(){Loader.loadNativeLibraries();}
        public PhaseRun run(ModelBuilder.Built b,Prepared p,String phase,double seconds,Cancellation cancel) {
            CpSolver solver=new CpSolver();Config cfg=p.input().config();
            solver.getParameters().setMaxTimeInSeconds(seconds).setNumSearchWorkers(cfg.workers()).setRandomSeed(cfg.seed()).setRelativeGapLimit(0).setAbsoluteGapLimit(0);
            cancel.register(solver);CpSolverStatus status;
            try {if(cancel.isCancelled())return new PhaseRun(new Phase(phase,"UNKNOWN","CANCELLED",null,null,0,false),null);status=solver.solve(b.model());}
            finally {cancel.clear();}
            boolean has=status==CpSolverStatus.OPTIMAL || status==CpSolverStatus.FEASIBLE;
            Long objective=has?solver.value(phase.equals("COVERAGE")?b.coverage():b.soft()):null;
            Double bound=has?solver.bestObjectiveBound():null;
            boolean proof=status==CpSolverStatus.OPTIMAL && objective!=null && Math.abs(objective-bound)<1e-6;
            String stop=cancel.isCancelled()?"CANCELLED":proof?"EXACT_OPTIMUM":status==CpSolverStatus.INFEASIBLE?"PROVEN_INFEASIBLE":status==CpSolverStatus.MODEL_INVALID?"MODEL_INVALID":solver.wallTime()>=seconds*0.95?"TIME_LIMIT":"SEARCH_ENDED_WITHOUT_PROOF";
            Map<String,String> map=null;
            if(has){map=new LinkedHashMap<>();for(int j=0;j<p.input().demands().size();j++){String teacher=null;for(int i=0;i<p.input().teachers().size();i++)if(b.x()[i][j]!=null && solver.booleanValue(b.x()[i][j]))teacher=p.input().teachers().get(i).id();map.put(p.input().demands().get(j).id(),teacher);}}
            return new PhaseRun(new Phase(phase,status.name(),stop,objective,bound,solver.wallTime(),proof),map);
        }
    }
}
