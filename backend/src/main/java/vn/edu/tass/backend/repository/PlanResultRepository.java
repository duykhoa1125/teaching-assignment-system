package vn.edu.tass.backend.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import vn.edu.tass.backend.payload.dto.PlanResultDto.*;
import vn.edu.tass.backend.payload.dto.PlanVersionDto;
import vn.edu.tass.backend.solver.PlanValidationEvaluator;
import vn.edu.tass.solver.Json;

@Repository
public class PlanResultRepository {
    private final JdbcTemplate jdbc;
    public PlanResultRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public List<AssignmentRow> assignments(long version,JsonNode source) {
        var demands=index(source,"demands"); var classes=index(source,"classes"); var subjects=index(source,"subjects"); var teachers=index(source,"teachers");
        return jdbc.query("SELECT * FROM plan_demand WHERE plan_version_id=? ORDER BY demand_id,id",(rs,n)->{
            var demand=demands.getOrDefault(rs.getLong("demand_id"),Json.MAPPER.createObjectNode());
            long classroom=demand.path("class_id").asLong(),subject=demand.path("subject_id").asLong();
            Long teacher=rs.getObject("teacher_id",Long.class);
            return new AssignmentRow(rs.getLong("id"),rs.getLong("demand_id"),classroom,label(classes,classroom,"class_code"),subject,label(subjects,subject,"name"),
                demand.path("demand_type").asText(null),rs.getBigDecimal("periods_per_week_snapshot"),date(demand,"valid_from"),date(demand,"valid_to"),teacher,
                teacher==null?null:label(teachers,teacher,"full_name"),rs.getBoolean("is_locked"),rs.getObject("locked_by",Long.class),rs.getObject("locked_at",OffsetDateTime.class),
                rs.getString("lock_reason"),rs.getString("unassigned_reason_code"),rs.getString("unassigned_reason_text"));
        },version);
    }
    public long save(PlanVersionDto version,long actor,PlanValidationEvaluator.Evaluation checked) {
        var summary=Json.MAPPER.createObjectNode().put("contract_version",1).put("illustrative_rules",true).put("finding_count",checked.findings().size());
        summary.set("coverage",Json.MAPPER.valueToTree(checked.coverage())); summary.set("warnings",Json.MAPPER.valueToTree(checked.warnings()));
        long id=jdbc.queryForObject("""
            INSERT INTO validation_run(plan_version_id,input_snapshot_id,revision_no,checked_by,overall_status,source_revision_token,validator_version,workloads_json,summary_json)
            VALUES(?,?,?,?,?,?,'tass-validation/1',?::jsonb,?::jsonb) RETURNING id
            """,Long.class,version.versionId(),version.inputSnapshotId(),version.revisionNo(),actor,checked.status(),version.sourceRevisionToken(),encode(checked.workloads()),summary.toString());
        for(var f:checked.findings()) jdbc.update("""
            INSERT INTO validation_result(validation_run_id,rule_definition_id,br_code,subject_type,subject_ref,calculation_period,result_status,severity,missing_data_json,message,details_json)
            VALUES(?,(SELECT id FROM rule_definition WHERE rule_set_version_id=? AND rule_code=?),?,?,?,?,?,?,?::jsonb,?,?::jsonb)
            """,id,version.ruleSetVersionId(),f.brCode(),f.brCode(),f.subjectType(),f.subjectRef(),f.calculationPeriod(),f.resultStatus(),f.severity(),encode(f.missingData()),f.message(),f.details()==null?null:f.details().toString());
        return id;
    }
    public Optional<ValidationReport> validation(long version,Long id) {
        var results=jdbc.query("""
            SELECT *,tass_validation_is_fresh(id) fresh FROM validation_run
            WHERE plan_version_id=? AND (?::bigint IS NULL OR id=?::bigint) ORDER BY checked_at DESC,id DESC LIMIT 1
            """,(rs,n)->{
            long run=rs.getLong("id");
            var findings=jdbc.query("SELECT * FROM validation_result WHERE validation_run_id=? ORDER BY id",(r,i)->new Finding(r.getString("br_code"),r.getString("subject_type"),
                r.getString("subject_ref"),r.getString("calculation_period"),r.getString("result_status"),r.getString("severity"),decode(r.getString("missing_data_json"),new TypeReference<List<String>>(){},List.of()),
                r.getString("message"),tree(r.getString("details_json"))),run);
            return new ValidationReport(run,version,rs.getLong("revision_no"),rs.getLong("input_snapshot_id"),rs.getString("source_revision_token"),rs.getObject("checked_at",OffsetDateTime.class),
                rs.getObject("checked_by",Long.class),rs.getString("overall_status"),rs.getBoolean("fresh"),rs.getString("validator_version"),findings,
                decode(rs.getString("workloads_json"),new TypeReference<List<WorkloadRow>>(){},List.of()),tree(rs.getString("summary_json")));
        },version,id,id);
        return results.stream().findFirst();
    }
    public Long latestRun(long version,boolean appliedOnly) {
        return jdbc.query("SELECT id FROM solver_run WHERE plan_version_id=? "+(appliedOnly?"AND result_summary_json->>'apply_outcome'='APPLIED' ":"")+"ORDER BY id DESC LIMIT 1",
            (rs,n)->rs.getLong(1),version).stream().findFirst().orElse(null);
    }
    public JsonNode result(long run) { return tree(jdbc.queryForObject("SELECT solver_result_json::text FROM solver_run WHERE id=?",String.class,run)); }
    private static Map<Long,JsonNode> index(JsonNode source,String key) { Map<Long,JsonNode> found=new HashMap<>(); source.path(key).forEach(v->found.put(v.path("id").asLong(),v)); return found; }
    private static String label(Map<Long,JsonNode> rows,long id,String key) { var row=rows.get(id); return row==null?null:row.path(key).asText(null); }
    private static java.time.LocalDate date(JsonNode row,String key) { return row.hasNonNull(key)?java.time.LocalDate.parse(row.path(key).asText()):null; }
    private static String encode(Object value) { try { return Json.MAPPER.writeValueAsString(value); } catch(java.io.IOException e) { throw new IllegalStateException(e); } }
    private static JsonNode tree(String json) { return json==null?null:PlanValidationEvaluator.parse(json); }
    private static <T> T decode(String json,TypeReference<T> type,T fallback) { try { return json==null?fallback:Json.MAPPER.readValue(json,type); } catch(java.io.IOException e) { throw new IllegalStateException("Invalid saved validation report",e); } }
}
