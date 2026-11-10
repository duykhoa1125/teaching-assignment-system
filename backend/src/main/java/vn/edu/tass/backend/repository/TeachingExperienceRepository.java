package vn.edu.tass.backend.repository;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import vn.edu.tass.backend.entity.TeachingExperience;

public interface TeachingExperienceRepository extends JpaRepository<TeachingExperience, Long>, JpaSpecificationExecutor<TeachingExperience> {
    List<TeachingExperience> findByTeacherIdAndAsOfDateLessThanEqualOrderByAsOfDateDescIdDesc(
        long teacherId, LocalDate asOfDate);
}
