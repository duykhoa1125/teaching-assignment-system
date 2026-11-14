package vn.edu.tass.backend.solver;

import vn.edu.tass.solver.Contract;
import vn.edu.tass.solver.Json;

/** Exact canonical bytes are archived as UTF-8 text; never hash PostgreSQL jsonb::text. */
public record SolverInputArchive(Contract.Snapshot snapshot,String canonicalJson,String sha256) {
    public static SolverInputArchive create(Contract.Snapshot snapshot) {
        try { return new SolverInputArchive(snapshot,Json.MAPPER.writeValueAsString(snapshot),Json.hash(snapshot)); }
        catch (java.io.IOException e) { throw new IllegalStateException("Cannot serialize normalized solver input",e); }
    }
}
