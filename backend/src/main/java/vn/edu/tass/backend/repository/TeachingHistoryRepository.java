package vn.edu.tass.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import vn.edu.tass.backend.entity.TeachingHistory;

public interface TeachingHistoryRepository extends JpaRepository<TeachingHistory, Long>, JpaSpecificationExecutor<TeachingHistory> {
}
