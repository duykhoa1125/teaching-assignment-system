package vn.edu.tass.backend.repository;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.tass.backend.entity.TeacherWorkloadBasis;

public interface TeacherWorkloadBasisRepository extends JpaRepository<TeacherWorkloadBasis, Long>, JpaSpecificationExecutor<TeacherWorkloadBasis> {
    @Query("select b from TeacherWorkloadBasis b where b.teacherId = :teacherId and b.semesterId = :semesterId "
        + "and b.validFrom <= :endsOn and b.validTo >= :startsOn order by b.id")
    List<TeacherWorkloadBasis> findForProfile(@Param("teacherId") long teacherId,
        @Param("semesterId") long semesterId, @Param("startsOn") LocalDate startsOn,
        @Param("endsOn") LocalDate endsOn);
}
