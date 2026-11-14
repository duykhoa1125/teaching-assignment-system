package vn.edu.tass.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import vn.edu.tass.solver.AssignmentSolver;
import vn.edu.tass.solver.InputValidator;
import vn.edu.tass.solver.SolutionValidator;

/** In-process solver infrastructure. Each run must supply its own Cancellation. */
@Configuration(proxyBeanMethods = false)
public class SolverConfiguration {
    @Bean
    AssignmentSolver assignmentSolver() {
        // The constructor loads OR-Tools native libraries once for this singleton.
        // Fail startup if the runtime cannot load them, before accepting any runs.
        return new AssignmentSolver();
    }

    @Bean
    InputValidator solverInputValidator() {
        return new InputValidator();
    }

    @Bean
    SolutionValidator solverSolutionValidator() {
        return new SolutionValidator();
    }
}
