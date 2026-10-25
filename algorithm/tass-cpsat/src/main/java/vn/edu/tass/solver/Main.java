package vn.edu.tass.solver;

import static vn.edu.tass.solver.Contract.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

public final class Main {
    private Main() {}
    public static void main(String[] args) throws Exception {
        if(args.length!=2){System.err.println("Usage: java -jar tass-cpsat-0.1.0.jar <snapshot.json> <NEW-output-directory>");System.exit(64);}
        Path input=Path.of(args[0]).toAbsolutePath().normalize(),output=Path.of(args[1]).toAbsolutePath().normalize();
        if(Files.exists(output)){System.err.println("Output directory already exists. Choose a new directory to preserve prior results.");System.exit(73);}
        Snapshot snapshot;
        try {snapshot=Json.MAPPER.readValue(input.toFile(),Snapshot.class);}
        catch(Exception ex){System.err.println("INVALID_JSON: "+ex.getMessage());System.exit(65);return;}
        Result result=new AssignmentSolver().solve(snapshot);
        Files.createDirectories(output);
        Json.MAPPER.writerWithDefaultPrettyPrinter().writeValue(output.resolve("input-snapshot.json").toFile(),snapshot);
        Json.MAPPER.writerWithDefaultPrettyPrinter().writeValue(output.resolve("result.json").toFile(),result);
        List<String> rows=new ArrayList<>();rows.add("demandId,classId,subjectId,demandType,periods,teacherId,reasonCode,reason");
        for(Assignment a:result.assignments())rows.add(String.join(",",csv(a.demandId()),csv(a.classId()),csv(a.subjectId()),csv(a.type()),csv(a.periods()),csv(a.teacherId()),csv(a.reasonCode()),csv(a.reason())));
        Files.write(output.resolve("assignments.csv"),rows,StandardCharsets.UTF_8);
        List<String> loadRows=new ArrayList<>();loadRows.add("teacherId,B,R,Q,A,F,C,W,deltaA,deltaW,under,over,targetApplicable");
        for(Load l:result.loads())loadRows.add(String.join(",",csv(l.teacherId()),csv(l.B()),csv(l.R()),csv(l.Q()),csv(l.A()),csv(l.F()),csv(l.C()),csv(l.W()),csv(l.deltaA()),csv(l.deltaW()),csv(l.under()),csv(l.over()),csv(l.targetApplicable())));
        Files.write(output.resolve("loads.csv"),loadRows,StandardCharsets.UTF_8);
        System.out.println(result.status()+" -> "+output);
        if(result.metrics()!=null)System.out.println("Assigned "+result.metrics().assignedComponents()+"/"+result.metrics().totalComponents()+"; missing periods="+result.metrics().missingPeriods()+"; coverage proof="+result.coverageOptimalityProven());
        if(!result.hasCandidate())System.exit(result.status().equals("INVALID_INPUT")?2:3);
    }
    // Excel-safe text cells. This does not change JSON or stored identifiers.
    private static String csv(Object value){String text=value==null?"":value.toString();if(value instanceof String && text.matches("^[=+@-].*"))text="'"+text;return "\""+text.replace("\"","\"\"")+"\"";}
}
