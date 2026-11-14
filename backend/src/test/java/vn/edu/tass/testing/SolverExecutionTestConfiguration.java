package vn.edu.tass.testing;

import org.springframework.context.annotation.*;
import vn.edu.tass.backend.controller.SolverRunController;
import vn.edu.tass.backend.repository.SolverRunRepository;
import vn.edu.tass.backend.repository.SolverAssignmentRepository;
import vn.edu.tass.backend.solver.SolverResultApplier;
import vn.edu.tass.backend.solver.SolverRunCoordinator;
import vn.edu.tass.solver.AssignmentSolver;
import vn.edu.tass.backend.controller.PlanResultController;
import vn.edu.tass.backend.controller.RuntimeHealthController;
import vn.edu.tass.backend.service.PlanResultService;
import vn.edu.tass.backend.repository.PlanResultRepository;
import vn.edu.tass.backend.solver.PlanValidationEvaluator;

@Configuration(proxyBeanMethods=false)
@Import({SolverRunCoordinator.class,SolverRunRepository.class,SolverAssignmentRepository.class,SolverResultApplier.class,SolverRunController.class,
    PlanResultController.class,PlanResultService.class,PlanResultRepository.class,PlanValidationEvaluator.class,RuntimeHealthController.class,
    vn.edu.tass.backend.controller.PlanAssignmentController.class,vn.edu.tass.backend.service.PlanAssignmentService.class,
    vn.edu.tass.backend.repository.PlanAssignmentRepository.class})
public class SolverExecutionTestConfiguration {
    @Bean ControlledSolverEngine controlledSolverEngine(AssignmentSolver solver) { return new ControlledSolverEngine(solver); }
}
