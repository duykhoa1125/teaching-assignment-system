package vn.edu.tass.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.tass.backend.entity.SchoolClass;

public interface SchoolClassRepository extends JpaRepository<SchoolClass, Long> {
}