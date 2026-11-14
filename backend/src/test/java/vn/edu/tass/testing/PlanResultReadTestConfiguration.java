package vn.edu.tass.testing;

import org.springframework.context.annotation.*;
import vn.edu.tass.backend.controller.PlanResultController;
import vn.edu.tass.backend.service.PlanResultService;
import vn.edu.tass.backend.repository.*;
import vn.edu.tass.backend.solver.PlanValidationEvaluator;

/** Fresh-JVM verification reads persisted results without starting another solver coordinator. */
@Configuration(proxyBeanMethods=false)
@Import({PlanResultController.class,PlanResultService.class,PlanResultRepository.class,SolverRunRepository.class,PlanValidationEvaluator.class})
public class PlanResultReadTestConfiguration {}
