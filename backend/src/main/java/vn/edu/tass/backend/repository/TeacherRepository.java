package vn.edu.tass.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.tass.backend.entity.Teacher;

public interface TeacherRepository extends JpaRepository<Teacher, Long> {
}