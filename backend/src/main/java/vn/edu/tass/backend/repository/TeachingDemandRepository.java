package vn.edu.tass.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import vn.edu.tass.backend.entity.TeachingDemand;

public interface TeachingDemandRepository extends JpaRepository<TeachingDemand, Long>, JpaSpecificationExecutor<TeachingDemand> {
}
