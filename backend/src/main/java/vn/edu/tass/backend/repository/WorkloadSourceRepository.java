package vn.edu.tass.backend.repository;

import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Reads immutable captured inputs, never a mixture of live source rows. */
@Repository
public class WorkloadSourceRepository {
    public record Captured(long id,long roundId,long configId,long rulesId,String token,String contentHash,String payload) {}
    private final JdbcTemplate jdbc;
    public WorkloadSourceRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }

    public Optional<Captured> read(long snapshotId) {
        return jdbc.query("SELECT *,content_hash=md5(payload_json::text) checksum_valid FROM input_snapshot WHERE id=?",(rs,row)-> {
            if (!rs.getBoolean("checksum_valid")) throw new vn.edu.tass.backend.solver.WorkloadInputException("DB_SNAPSHOT_HASH_MISMATCH","input_snapshot#"+snapshotId,"DB snapshot checksum differs");
            return new Captured(rs.getLong("id"),
            rs.getLong("round_id"),rs.getLong("optimization_config_id"),rs.getLong("rule_set_version_id"),
            rs.getString("source_revision_token"),rs.getString("content_hash"),rs.getString("payload_json"));
        },snapshotId).stream().findFirst();
    }
}
