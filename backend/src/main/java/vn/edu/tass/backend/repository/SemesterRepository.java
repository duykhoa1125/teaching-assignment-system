package vn.edu.tass.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.tass.backend.entity.Semester;

public interface SemesterRepository extends JpaRepository<Semester, Long> {
}