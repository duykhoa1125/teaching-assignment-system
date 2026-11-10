package vn.edu.tass.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import vn.edu.tass.backend.entity.RoundSubjectScope;

public interface RoundSubjectScopeRepository extends JpaRepository<RoundSubjectScope, Long>, JpaSpecificationExecutor<RoundSubjectScope> {
}
