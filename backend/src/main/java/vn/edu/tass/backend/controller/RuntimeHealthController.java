package vn.edu.tass.backend.controller;

import java.util.Map;
import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.boot.availability.ApplicationAvailability;
import org.springframework.boot.availability.ReadinessState;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import vn.edu.tass.backend.solver.SolverRunCoordinator;

/** Minimal readiness probe; never exposes credentials, queries or native/runtime diagnostics. */
@Hidden
@RestController
public class RuntimeHealthController {
    private final ApplicationAvailability availability;
    private final SolverRunCoordinator coordinator;
    private final JdbcTemplate jdbc;
    public RuntimeHealthController(ApplicationAvailability availability,SolverRunCoordinator coordinator,JdbcTemplate jdbc) {
        this.availability=availability; this.coordinator=coordinator; this.jdbc=jdbc;
    }
    @GetMapping("/internal/health")
    public ResponseEntity<Map<String,String>> health() {
        try {
            if(availability.getReadinessState()==ReadinessState.ACCEPTING_TRAFFIC && coordinator.isReady()
                && Integer.valueOf(1).equals(jdbc.queryForObject("SELECT 1",Integer.class))) return ResponseEntity.ok(Map.of("status","UP"));
        } catch(RuntimeException ignored) { /* Generic status only; detailed errors remain in server logs. */ }
        return ResponseEntity.status(503).body(Map.of("status","DOWN"));
    }
}
