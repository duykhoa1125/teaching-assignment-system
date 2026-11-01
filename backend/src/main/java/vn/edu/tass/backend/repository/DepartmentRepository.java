package vn.edu.tass.backend.repository;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.tass.backend.entity.Department;
import vn.edu.tass.backend.repository.support.JdbcCrudRepository;

@Repository
public class DepartmentRepository extends JdbcCrudRepository<Department> {
    public DepartmentRepository(NamedParameterJdbcTemplate jdbc) {
        super(jdbc, Department.class);
    }
}
