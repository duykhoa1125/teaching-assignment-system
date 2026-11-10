package vn.edu.tass.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import vn.edu.tass.backend.entity.AssignmentRound;

public interface AssignmentRoundRepository extends JpaRepository<AssignmentRound, Long>, JpaSpecificationExecutor<AssignmentRound> {
}
