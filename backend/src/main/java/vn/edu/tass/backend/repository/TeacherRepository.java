package vn.edu.tass.backend.repository;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.tass.backend.entity.Teacher;
import vn.edu.tass.backend.repository.support.JdbcCrudRepository;

@Repository
public class TeacherRepository extends JdbcCrudRepository<Teacher> {
    public TeacherRepository(NamedParameterJdbcTemplate jdbc) {
        super(jdbc, Teacher.class);
    }
}
