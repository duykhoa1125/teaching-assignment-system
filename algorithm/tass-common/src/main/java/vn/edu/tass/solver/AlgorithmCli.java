package vn.edu.tass.solver;

import static vn.edu.tass.solver.Contract.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/** Export schema intentionally matches the existing CP-SAT CLI. */
public final class AlgorithmCli {
    private AlgorithmCli() {}
    public static void run(String[] args,SolverAlgorithm algorithm) throws Exception {
        if(args.length!=2){System.err.println("Usage: java -jar <algorithm-all.jar> <snapshot.json> <NEW-output-directory>");System.exit(64);}
        Path input=Path.of(args[0]).toAbsolutePath().normalize(),out=Path.of(args[1]).toAbsolutePath().normalize();
        if(Files.exists(out)){System.err.println("Output already exists; choose a new directory.");System.exit(73);}
        Snapshot snapshot;
        try{snapshot=Json.MAPPER.readValue(input.toFile(),Snapshot.class);}catch(Exception ex){System.err.println("INVALID_JSON: "+ex.getMessage());System.exit(65);return;}
        Result result=algorithm.solve(snapshot);write(out,snapshot,result);
        System.out.println(algorithm.name()+" "+result.status()+" -> "+out);
        if(result.metrics()!=null)System.out.println("Assigned "+result.metrics().assignedComponents()+"/"+result.metrics().totalComponents()+"; coverage="+result.metrics().coverageObjective()+"; objectives="+result.metrics().objectiveVector());
        if(!result.hasCandidate())System.exit(result.status().equals("INVALID_INPUT")?2:3);
    }
    public static void write(Path out,Snapshot snapshot,Result result) throws Exception {
        if(out.getParent()!=null)Files.createDirectories(out.getParent());
        Files.createDirectory(out);
        Json.MAPPER.writerWithDefaultPrettyPrinter().writeValue(out.resolve("input-snapshot.json").toFile(),snapshot);
        Json.MAPPER.writerWithDefaultPrettyPrinter().writeValue(out.resolve("result.json").toFile(),result);
        List<String> rows=new ArrayList<>();rows.add("demandId,classId,subjectId,demandType,periods,teacherId,reasonCode,reason");
        for(Assignment a:result.assignments())rows.add(csv(a.demandId(),a.classId(),a.subjectId(),a.type(),a.periods(),a.teacherId(),a.reasonCode(),a.reason()));
        Files.write(out.resolve("assignments.csv"),rows,StandardCharsets.UTF_8);
        rows=new ArrayList<>();rows.add("teacherId,B,R,Q,A,F,C,W,deltaA,deltaW,under,over,targetApplicable,T,deltaT");
        for(Load l:result.loads())rows.add(csv(l.teacherId(),l.B(),l.R(),l.Q(),l.A(),l.F(),l.C(),l.W(),l.deltaA(),l.deltaW(),l.under(),l.over(),l.targetApplicable(),l.T(),l.deltaT()));
        Files.write(out.resolve("loads.csv"),rows,StandardCharsets.UTF_8);
    }
    public static String csv(Object... values) {
        List<String> result=new ArrayList<>();for(Object value:values){String s=value==null?"":value.toString();if(value instanceof String && !s.isEmpty() && "=+@-".indexOf(s.charAt(0))>=0)s="'"+s;result.add("\""+s.replace("\"","\"\"")+"\"");}return String.join(",",result);
    }
}
