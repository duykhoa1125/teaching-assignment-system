package vn.edu.tass.backend.repository;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.tass.backend.entity.TeachingQualification;

public interface TeachingQualificationRepository extends JpaRepository<TeachingQualification, Long>, JpaSpecificationExecutor<TeachingQualification> {
    @Query("select q from TeachingQualification q where q.teacherId = :teacherId "
        + "and q.validFrom <= :endsOn and (q.validTo is null or q.validTo >= :startsOn) order by q.id")
    List<TeachingQualification> findForProfile(@Param("teacherId") long teacherId,
        @Param("startsOn") LocalDate startsOn, @Param("endsOn") LocalDate endsOn);
}
