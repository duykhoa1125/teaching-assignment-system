package vn.edu.tass.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.tass.backend.entity.TeacherEmployment;

public interface TeacherEmploymentRepository extends JpaRepository<TeacherEmployment, Long> {
}