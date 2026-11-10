package vn.edu.tass.backend.repository;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.tass.backend.entity.TeacherEmployment;

public interface TeacherEmploymentRepository extends JpaRepository<TeacherEmployment, Long>, JpaSpecificationExecutor<TeacherEmployment> {
    @Query("select e from TeacherEmployment e where e.teacherId = :teacherId and e.semesterId = :semesterId "
        + "and e.validFrom <= :endsOn and (e.validTo is null or e.validTo >= :startsOn) order by e.id")
    List<TeacherEmployment> findForProfile(@Param("teacherId") long teacherId,
        @Param("semesterId") long semesterId, @Param("startsOn") LocalDate startsOn,
        @Param("endsOn") LocalDate endsOn);
}
