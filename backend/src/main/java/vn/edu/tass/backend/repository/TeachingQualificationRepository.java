package vn.edu.tass.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.tass.backend.entity.TeachingQualification;

public interface TeachingQualificationRepository extends JpaRepository<TeachingQualification, Long> {
}