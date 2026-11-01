package vn.edu.tass.backend.repository;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.tass.backend.entity.School;
import vn.edu.tass.backend.repository.support.JdbcCrudRepository;

@Repository
public class SchoolRepository extends JdbcCrudRepository<School> {
    public SchoolRepository(NamedParameterJdbcTemplate jdbc) {
        super(jdbc, School.class);
    }
}
