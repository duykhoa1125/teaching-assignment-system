package vn.edu.tass.backend.solver;

import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;
import vn.edu.tass.solver.*;

/** SQL summary contract is distinct from the library's Result DTO. */
public final class SolverRunSummary {
    private SolverRunSummary() {}
    public static ObjectNode create(Contract.Snapshot input,Contract.Result result,String reason) {
        var j=Json.MAPPER.createObjectNode();
        j.put("contract_version",1).put("ortools_version",AssignmentSolver.ORTOOLS_VERSION)
            .put("random_seed",input.config().seed()).put("num_workers",input.config().workers())
            .put("total_budget_seconds",input.config().totalSeconds()).put("cp_sat_status",result==null?"NOT_RUN":result.status())
            .put("termination_reason",reason).put("apply_outcome","NOT_APPLIED")
            .put("demo_only",false).put("illustrative_workload_rules",input.config().demoAssumptions())
            .put("config_hash",configHash(input.config()));
        var stages=j.putArray("stages");
        for (String name:List.of("Z","L1","M","experience","change")) {
            var phase=result==null?null:result.phases().stream().filter(p->name.equals(p.name())).findFirst().orElse(null);
            String state=phase==null?"NOT_RUN":phase.status()!=null&&java.util.Set.of("NOT_RUN","OPTIMAL","FEASIBLE","INFEASIBLE","UNKNOWN","MODEL_INVALID").contains(phase.status())?phase.status():"MODEL_INVALID";
            Double bound=phase!=null&&phase.bestBound()!=null&&Double.isFinite(phase.bestBound())?phase.bestBound():null;
            boolean exact=phase!=null && phase.exactOptimalityProven() && state.equals("OPTIMAL") && phase.objective()!=null && bound!=null
                && java.math.BigDecimal.valueOf(bound).compareTo(java.math.BigDecimal.valueOf(phase.objective()))==0;
            var s=stages.addObject().put("name",name).put("status",state)
                .put("elapsed_ms",phase==null||!Double.isFinite(phase.seconds())?0:Math.max(0,Math.round(phase.seconds()*1000)))
                .put("stop_reason",phase==null?reason:phase.stopReason()).put("exactOptimalityProven",exact)
                .put("gap_tolerance",0);
            if (phase==null || phase.objective()==null) s.putNull("objective"); else s.put("objective",phase.objective());
            if (bound==null) s.putNull("best_bound"); else s.put("best_bound",bound);
        }
        var coverage=j.putObject("coverage").put("optimality_proven",result!=null&&result.coverageOptimalityProven());
        if (result!=null && result.metrics()!=null) coverage.set("metrics",Json.MAPPER.valueToTree(result.metrics()));
        return j;
    }
    private static String configHash(Contract.Config config) {
        try { return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(Json.MAPPER.writeValueAsBytes(config))); }
        catch (Exception e) { throw new IllegalStateException("Cannot hash solver configuration",e); }
    }
}
