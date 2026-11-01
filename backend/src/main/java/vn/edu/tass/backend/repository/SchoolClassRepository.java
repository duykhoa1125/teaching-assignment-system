package vn.edu.tass.backend.repository;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.tass.backend.entity.SchoolClass;
import vn.edu.tass.backend.repository.support.JdbcCrudRepository;

@Repository
public class SchoolClassRepository extends JdbcCrudRepository<SchoolClass> {
    public SchoolClassRepository(NamedParameterJdbcTemplate jdbc) {
        super(jdbc, SchoolClass.class);
    }
}
