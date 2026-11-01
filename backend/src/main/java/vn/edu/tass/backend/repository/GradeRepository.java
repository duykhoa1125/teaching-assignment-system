package vn.edu.tass.backend.repository;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.tass.backend.entity.Grade;
import vn.edu.tass.backend.repository.support.JdbcCrudRepository;

@Repository
public class GradeRepository extends JdbcCrudRepository<Grade> {
    public GradeRepository(NamedParameterJdbcTemplate jdbc) {
        super(jdbc, Grade.class);
    }
}
