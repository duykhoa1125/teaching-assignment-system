package vn.edu.tass.backend.repository;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.tass.backend.entity.TeachingHistory;

public interface TeachingHistoryRepository extends JpaRepository<TeachingHistory, Long>, JpaSpecificationExecutor<TeachingHistory> {
    @Query("select h from TeachingHistory h where h.teacherId = :teacherId "
        + "and h.taughtTo <= :endsOn order by h.taughtTo desc, h.id desc")
    List<TeachingHistory> findForProfile(@Param("teacherId") long teacherId,
        @Param("endsOn") LocalDate endsOn);
}
