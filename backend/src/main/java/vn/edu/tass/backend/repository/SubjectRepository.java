package vn.edu.tass.backend.repository;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.tass.backend.entity.Subject;
import vn.edu.tass.backend.repository.support.JdbcCrudRepository;

@Repository
public class SubjectRepository extends JdbcCrudRepository<Subject> {
    public SubjectRepository(NamedParameterJdbcTemplate jdbc) {
        super(jdbc, Subject.class);
    }
}
