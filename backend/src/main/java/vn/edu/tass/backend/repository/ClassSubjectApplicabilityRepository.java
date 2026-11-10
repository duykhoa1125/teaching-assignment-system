package vn.edu.tass.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import vn.edu.tass.backend.entity.ClassSubjectApplicability;

public interface ClassSubjectApplicabilityRepository extends JpaRepository<ClassSubjectApplicability, Long>, JpaSpecificationExecutor<ClassSubjectApplicability> {
}
