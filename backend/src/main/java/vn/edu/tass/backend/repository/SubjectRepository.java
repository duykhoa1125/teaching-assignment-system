package vn.edu.tass.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.tass.backend.entity.Subject;

public interface SubjectRepository extends JpaRepository<Subject, Long> {
}