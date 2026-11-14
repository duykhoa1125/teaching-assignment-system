package vn.edu.tass.backend.repository;

import java.math.BigDecimal;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import vn.edu.tass.solver.Contract;

@Repository
public class SolverAssignmentRepository {
    private record Row(long id,String demand,BigDecimal periods,String teacher,boolean locked) {}
    private final JdbcTemplate jdbc;
    public SolverAssignmentRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    /** Caller holds plan/version/round/run locks. Never deletes rows or alters lock metadata. */
    public void write(long version,Contract.Result result) {
        var rows=jdbc.query("SELECT * FROM plan_demand WHERE plan_version_id=? ORDER BY id FOR UPDATE",
            (rs,n)->new Row(rs.getLong("id"),rs.getString("demand_id"),rs.getBigDecimal("periods_per_week_snapshot"),rs.getString("teacher_id"),rs.getBoolean("is_locked")),version);
        Map<String,Contract.Assignment> desired=new HashMap<>(); result.assignments().forEach(a->desired.put(a.demandId(),a));
        if (rows.size()!=desired.size()) throw new IllegalStateException("Assignment row set differs from archived input");
        for (var row:rows) {
            var a=desired.get(row.demand());
            if (a==null || row.periods().compareTo(a.periods())!=0) throw new IllegalStateException("Assignment demand/periods differ from archived input");
            if (row.locked()) {
                if (!Objects.equals(row.teacher(),a.teacherId())) throw new IllegalStateException("Locked assignment changed");
                continue;
            }
            Long teacher=a.teacherId()==null?null:Long.valueOf(a.teacherId());
            jdbc.update("""
                UPDATE plan_demand SET teacher_id=?,unassigned_reason_code=?,unassigned_reason_text=?
                WHERE id=? AND NOT is_locked AND ROW(teacher_id,unassigned_reason_code,unassigned_reason_text)
                    IS DISTINCT FROM ROW(?::bigint,?::varchar,?::text)
                """,teacher,a.reasonCode(),a.reason(),row.id(),teacher,a.reasonCode(),a.reason());
        }
    }
    public void audit(long run,long actor,long base,long applied) {
        jdbc.update("""
            INSERT INTO audit_log(actor_id,action,entity_type,entity_ref,outcome,before_json,after_json)
            VALUES(?,'SOLVER_APPLY','SOLVER_RUN',?,'SUCCESS',jsonb_build_object('revision',?::bigint),jsonb_build_object('revision',?::bigint))
            """,actor,Long.toString(run),base,applied);
    }
}
