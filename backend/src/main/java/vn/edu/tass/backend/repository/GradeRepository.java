package vn.edu.tass.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.tass.backend.entity.Grade;

public interface GradeRepository extends JpaRepository<Grade, Long> {
}