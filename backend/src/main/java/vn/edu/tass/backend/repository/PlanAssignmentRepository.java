package vn.edu.tass.backend.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import vn.edu.tass.backend.payload.dto.PlanResultDto.AssignmentRow;
import vn.edu.tass.solver.Json;
import java.util.List;

@Repository
public class PlanAssignmentRepository {
    private final JdbcTemplate jdbc;
    public PlanAssignmentRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public void lockRows(long version) {
        jdbc.queryForList("SELECT id FROM plan_demand WHERE plan_version_id=? ORDER BY id FOR UPDATE",Long.class,version);
    }
    public void update(AssignmentRow row) {
        jdbc.update("UPDATE plan_demand SET teacher_id=?,unassigned_reason_code=?,unassigned_reason_text=? WHERE id=?",
            row.teacherId(),row.unassignedReasonCode(),row.unassignedReasonText(),row.id());
    }
    public void lock(long id,long actor,String reason) {
        jdbc.update("UPDATE plan_demand SET is_locked=true,locked_by=?,locked_at=clock_timestamp(),lock_reason=? WHERE id=? AND NOT is_locked",actor,reason,id);
    }
    public void unlock(long id) {
        jdbc.update("UPDATE plan_demand SET is_locked=false,locked_by=NULL,locked_at=NULL,lock_reason=NULL WHERE id=? AND is_locked",id);
    }
    public void audit(long version,long actor,String action,String reason,long before,long after,List<Long> ids) {
        var old=Json.MAPPER.createObjectNode().put("revision",before);
        var value=Json.MAPPER.createObjectNode().put("revision",after).put("reason",reason);
        value.set("assignment_ids",Json.MAPPER.valueToTree(ids));
        jdbc.update("""
            INSERT INTO audit_log(actor_id,action,entity_type,entity_ref,outcome,before_json,after_json)
            VALUES(?,?,'PLAN_VERSION',?,'SUCCESS',?::jsonb,?::jsonb)
            """,actor,action,Long.toString(version),old.toString(),value.toString());
    }
}
