package vn.edu.tass.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.tass.backend.entity.Department;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
}