package vn.edu.tass.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.tass.backend.entity.TeachingDemand;

public interface TeachingDemandRepository extends JpaRepository<TeachingDemand, Long> {
}