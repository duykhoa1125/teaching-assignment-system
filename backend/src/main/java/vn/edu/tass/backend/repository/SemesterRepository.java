package vn.edu.tass.backend.repository;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.tass.backend.entity.Semester;
import vn.edu.tass.backend.repository.support.JdbcCrudRepository;

@Repository
public class SemesterRepository extends JdbcCrudRepository<Semester> {
    public SemesterRepository(NamedParameterJdbcTemplate jdbc) {
        super(jdbc, Semester.class);
    }
}
