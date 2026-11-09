package vn.edu.tass.solver;

import static vn.edu.tass.solver.Contract.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/** Paired trials: all algorithms receive the identical snapshot/hash, seed and total budget. */
public final class BenchmarkMain {
    private BenchmarkMain() {}
    private record Observation(String dataset,int trial,String algorithm,String inputHash,int seed,
                               double wallSeconds,boolean valid,Result result) {}
    public static void main(String[] args) throws Exception {
        if(args.length<2 || args.length>4){System.err.println("Usage: <fixtures-directory> <NEW-output-directory> [repeats=5] [totalSeconds=2]");System.exit(64);}
        Path fixtures=Path.of(args[0]).toAbsolutePath().normalize(),out=Path.of(args[1]).toAbsolutePath().normalize();
        int repeats=args.length>=3?Integer.parseInt(args[2]):5;double seconds=args.length>=4?Double.parseDouble(args[3]):2;
        if(repeats<1 || repeats>1000 || !Double.isFinite(seconds) || seconds<=0 || seconds>3600)throw new IllegalArgumentException("Invalid repeat count/budget");
        if(Files.exists(out)){System.err.println("Output already exists; choose a new directory.");System.exit(73);}
        List<Path> files;try(var stream=Files.list(fixtures)){files=stream.filter(p->p.getFileName().toString().endsWith(".json")).sorted().toList();}
        if(files.isEmpty())throw new IllegalArgumentException("No .json fixtures in "+fixtures);
        Map<String,Snapshot> inputs=new LinkedHashMap<>();for(Path file:files){Snapshot s=Json.MAPPER.readValue(file.toFile(),Snapshot.class);new InputValidator().validate(s);inputs.put(file.getFileName().toString(),s);}
        AssignmentSolver cp=new AssignmentSolver();List<SolverAlgorithm> algorithms=List.of(
            new SolverAlgorithm(){public String name(){return "CP_SAT";}public Result solve(Snapshot s,Cancellation c){return cp.solve(s,c);}},
            new GreedySolver(),new GeneticSolver());
        // Excluded warm-up, same immutable snapshot for all three. Native library startup precedes measurement.
        Snapshot warm=paired(inputs.values().iterator().next(),0,seconds);
        for(SolverAlgorithm algorithm:algorithms)algorithm.solve(warm);
        Files.createDirectories(out.getParent());Files.createDirectory(out);
        Map<String,Object> manifest=new LinkedHashMap<>();manifest.put("schemaVersion","tass-benchmark/1");manifest.put("algorithms",algorithms.stream().map(SolverAlgorithm::name).toList());manifest.put("repeats",repeats);manifest.put("totalSeconds",seconds);manifest.put("workers",1);manifest.put("warmupRunsPerAlgorithm",1);manifest.put("javaVersion",System.getProperty("java.runtime.version"));manifest.put("javaVendor",System.getProperty("java.vendor"));manifest.put("os",System.getProperty("os.name")+" "+System.getProperty("os.arch"));manifest.put("logicalProcessors",Runtime.getRuntime().availableProcessors());manifest.put("ortools",AssignmentSolver.ORTOOLS_VERSION);manifest.put("gaOptions",GeneticSolver.Options.defaults());manifest.put("ranking","Lexicographic: hard feasibility, then (Z,L1,M,experience,change). softObjective is a legacy L1 alias, not a ranking. Time is reported separately.");manifest.put("timing","End-to-end solve() wall time, including preprocessing and independent validation, excluding JSON I/O and one warm-up per algorithm. Algorithms run sequentially with rotating order.");
        Map<String,String> hashes=new LinkedHashMap<>();inputs.forEach((name,s)->hashes.put(name,Json.hash(s)));manifest.put("sourceSnapshotHashes",hashes);
        Json.MAPPER.writerWithDefaultPrettyPrinter().writeValue(out.resolve("manifest.json").toFile(),manifest);
        List<Observation> observations=new ArrayList<>();List<String> rows=new ArrayList<>();
        rows.add("dataset,trial,algorithm,inputHash,seed,budgetSeconds,valid,status,assigned,total,missingPeriods,coverageObjective,softObjective,loadDeviation,experiencePenalty,changes,completeGroups,wallSeconds,coverageProof,softProof,budgetExceeded,maxLoadDeviation,objectiveVector");
        int datasetIndex=0;
        for(var entry:inputs.entrySet()) {
            String safe="dataset-"+(datasetIndex++)+"-"+entry.getKey().replaceAll("[^a-zA-Z0-9._-]","_");
            for(int trial=0;trial<repeats;trial++) {
                Snapshot s=paired(entry.getValue(),trial,seconds);String hash=Json.hash(s);
                for(int position=0;position<algorithms.size();position++) {
                    SolverAlgorithm algorithm=algorithms.get((position+trial+datasetIndex)%algorithms.size());
                    long started=System.nanoTime();Result r=algorithm.solve(s);double wall=(System.nanoTime()-started)/1e9;
                    boolean valid=false;
                    if(r.hasCandidate()){
                        Map<String,String> assignment=new LinkedHashMap<>();for(Assignment a:r.assignments()){if(assignment.containsKey(a.demandId()))throw new IllegalStateException("Duplicate assignment");assignment.put(a.demandId(),a.teacherId());}
                        var evaluation=new SolutionValidator().evaluate(s,assignment,r.coverageOptimalityProven());
                        if(!evaluation.metrics().equals(r.metrics()) || !s.identity().equals(r.identity()))throw new IllegalStateException("Result metadata/metrics differ from shared validator");valid=true;
                    }
                    if(!hash.equals(r.snapshotHash()))throw new IllegalStateException("Algorithm result snapshot hash differs");
                    Path run=out.resolve(safe).resolve("trial-"+(trial+1)).resolve(algorithm.name());AlgorithmCli.write(run,s,r);
                    Metrics m=r.metrics();rows.add(AlgorithmCli.csv(entry.getKey(),trial+1,algorithm.name(),hash,s.config().seed(),seconds,valid,r.status(),m==null?null:m.assignedComponents(),m==null?null:m.totalComponents(),m==null?null:m.missingPeriods(),m==null?null:m.coverageObjective(),m==null?null:m.softObjective(),m==null?null:m.loadDeviation(),m==null?null:m.experiencePenalty(),m==null?null:m.changes(),m==null?null:m.completeGroups(),wall,r.coverageOptimalityProven(),r.softOptimalityProven(),wall>seconds,m==null?null:m.maxLoadDeviation(),m==null?null:m.objectiveVector()));
                    observations.add(new Observation(entry.getKey(),trial+1,algorithm.name(),hash,s.config().seed(),wall,valid,r));
                }
            }
            System.out.println("Compared "+entry.getKey()+": "+repeats+" paired trials x 3 algorithms");
        }
        Files.write(out.resolve("runs.csv"),rows,StandardCharsets.UTF_8);writeSummary(out,observations);
        System.out.println("Comparison saved: "+out);
    }
    private static Snapshot paired(Snapshot source,int trial,double seconds) {
        Config c=source.config();Config cfg=new Config(c.coverageMode(),c.deviationBasis(),c.preservePolicy(),c.loadWeight(),c.experienceWeight(),c.changeWeight(),seconds,seconds*0.45,seconds*0.45,1,Math.floorMod(c.seed()+trial,Integer.MAX_VALUE),c.decisionSource()+"; paired benchmark budget",c.demoAssumptions(),rescaleBudgets(c,seconds),c.gradeWeights());
        Identity i=source.identity();Identity id=new Identity(i.schoolId(),i.semesterId(),i.roundId(),i.planId(),i.versionId(),i.baseRevision(),i.snapshotId()+"-benchmark-"+(trial+1),i.sourceRevisionToken(),i.ruleSetVersion(),i.optimizationConfigVersion()+"-BENCHMARK");
        return new Snapshot(source.schemaVersion(),id,source.period(),source.normalization(),cfg,source.scopes(),source.demands(),source.teachers(),source.previousAssignments(),source.previousSource(),source.prechecks(),source.hardCheckInventorySource(),source.lockedAssignments());
    }
    private static Map<String,Double> rescaleBudgets(Config c,double seconds) {
        Map<String,Double> result=new LinkedHashMap<>();
        for(String stage:AssignmentSolver.STAGES)result.put(stage,c.budget(stage)*seconds/c.totalSeconds());
        return result;
    }
    private static int compareVectors(List<Long> a,List<Long> b) {
        for(int k=0;k<5;k++){int compared=Long.compare(a.get(k),b.get(k));if(compared!=0)return compared;}return 0;
    }
    private static void writeSummary(Path out,List<Observation> rows) throws Exception {
        List<String> csv=new ArrayList<>();csv.add("dataset,algorithm,runs,validRuns,fullCoverageRuns,bestCoverage,worstCoverage,medianCoverage,minSoftAtBestCoverage,maxSoftAtBestCoverage,medianWallSeconds,p95WallSeconds,coverageProofRuns,bestObjectiveVector");
        Map<String,List<Observation>> groups=new LinkedHashMap<>();for(Observation row:rows)groups.computeIfAbsent(row.dataset()+"\u001f"+row.algorithm(),ignored->new ArrayList<>()).add(row);
        for(List<Observation> group:groups.values()) {
            Observation first=group.get(0);var valid=group.stream().filter(Observation::valid).toList();
            long best=valid.stream().mapToLong(v->v.result().metrics().coverageObjective()).min().orElse(-1),worst=valid.stream().mapToLong(v->v.result().metrics().coverageObjective()).max().orElse(-1);
            var atBest=valid.stream().filter(v->v.result().metrics().coverageObjective()==best).toList();
            csv.add(AlgorithmCli.csv(first.dataset(),first.algorithm(),group.size(),valid.size(),valid.stream().filter(v->v.result().metrics().unassignedComponents()==0).count(),best,worst,percentile(valid.stream().mapToDouble(v->v.result().metrics().coverageObjective()).toArray(),0.5),atBest.stream().mapToLong(v->v.result().metrics().softObjective()).min().orElse(-1),atBest.stream().mapToLong(v->v.result().metrics().softObjective()).max().orElse(-1),percentile(group.stream().mapToDouble(Observation::wallSeconds).toArray(),0.5),percentile(group.stream().mapToDouble(Observation::wallSeconds).toArray(),0.95),group.stream().filter(v->v.result().coverageOptimalityProven()).count(),valid.stream().map(v->v.result().metrics().objectiveVector()).min(BenchmarkMain::compareVectors).orElse(null)));
        }
        Files.write(out.resolve("summary.csv"),csv,StandardCharsets.UTF_8);
    }
    private static Double percentile(double[] values,double percentile) {if(values.length==0)return null;Arrays.sort(values);return values[Math.max(0,(int)Math.ceil(percentile*values.length)-1)];}
}
