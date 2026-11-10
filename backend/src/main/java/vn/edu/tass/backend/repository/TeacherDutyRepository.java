package vn.edu.tass.backend.repository;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.tass.backend.entity.TeacherDuty;

public interface TeacherDutyRepository extends JpaRepository<TeacherDuty, Long>, JpaSpecificationExecutor<TeacherDuty> {
    @Query("select d from TeacherDuty d where d.teacherId = :teacherId and d.semesterId = :semesterId "
        + "and d.validFrom <= :endsOn and (d.validTo is null or d.validTo >= :startsOn) order by d.id")
    List<TeacherDuty> findForProfile(@Param("teacherId") long teacherId,
        @Param("semesterId") long semesterId, @Param("startsOn") LocalDate startsOn,
        @Param("endsOn") LocalDate endsOn);
}
