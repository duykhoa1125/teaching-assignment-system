package vn.edu.tass.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.tass.backend.entity.School;

public interface SchoolRepository extends JpaRepository<School, Long> {
}