package vn.edu.tass.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import vn.edu.tass.backend.entity.TeacherWorkloadBasis;

public interface TeacherWorkloadBasisRepository extends JpaRepository<TeacherWorkloadBasis, Long>, JpaSpecificationExecutor<TeacherWorkloadBasis> {
}
