package vn.edu.tass.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.tass.backend.entity.EducationLevel;

public interface EducationLevelRepository extends JpaRepository<EducationLevel, Long> {
}