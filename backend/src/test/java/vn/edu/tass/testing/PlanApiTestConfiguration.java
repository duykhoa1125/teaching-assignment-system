package vn.edu.tass.testing;

import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import vn.edu.tass.backend.controller.AssignmentPlanController;
import vn.edu.tass.backend.controller.RoundReadinessController;
import vn.edu.tass.backend.exception.ApiExceptionHandler;
import vn.edu.tass.backend.repository.AssignmentPlanRepository;
import vn.edu.tass.backend.repository.RoundReadinessRepository;
import vn.edu.tass.backend.service.impl.AssignmentPlanServiceImpl;
import vn.edu.tass.backend.service.impl.PrincipalPlanActorResolver;
import vn.edu.tass.backend.service.impl.RoundReadinessServiceImpl;
import vn.edu.tass.backend.repository.WorkloadSourceRepository;
import vn.edu.tass.backend.solver.DbWorkloadPreparer;
import vn.edu.tass.backend.solver.SolverSnapshotMapper;
import vn.edu.tass.backend.solver.SolverInputPreparation;
import vn.edu.tass.backend.repository.SolverInputRepository;
import vn.edu.tass.backend.config.SolverConfiguration;

/** Outside the application's component-scan package so full backend tests keep their JPA setup. */
@Configuration(proxyBeanMethods=false)
@EnableAutoConfiguration(exclude={HibernateJpaAutoConfiguration.class,JpaRepositoriesAutoConfiguration.class})
@Import({AssignmentPlanController.class,RoundReadinessController.class,ApiExceptionHandler.class,
    AssignmentPlanRepository.class,RoundReadinessRepository.class,AssignmentPlanServiceImpl.class,
    PrincipalPlanActorResolver.class,RoundReadinessServiceImpl.class,WorkloadSourceRepository.class,DbWorkloadPreparer.class,
    SolverSnapshotMapper.class,SolverInputPreparation.class,SolverInputRepository.class,SolverConfiguration.class})
public class PlanApiTestConfiguration {}
