package vn.edu.tass.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.tass.backend.entity.AssignmentRound;

public interface AssignmentRoundRepository extends JpaRepository<AssignmentRound, Long> {
}