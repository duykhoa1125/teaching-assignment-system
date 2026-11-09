package vn.edu.tass.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import vn.edu.tass.backend.entity.TeacherDuty;

public interface TeacherDutyRepository extends JpaRepository<TeacherDuty, Long>, JpaSpecificationExecutor<TeacherDuty> {
}
