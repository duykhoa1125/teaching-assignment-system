package vn.edu.tass.backend.repository;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.tass.backend.entity.TeacherEmployment;
import vn.edu.tass.backend.repository.support.JdbcCrudRepository;

@Repository
public class TeacherEmploymentRepository extends JdbcCrudRepository<TeacherEmployment> {
    public TeacherEmploymentRepository(NamedParameterJdbcTemplate jdbc) {
        super(jdbc, TeacherEmployment.class);
    }
}
