package vn.edu.tass.backend.repository;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.tass.backend.entity.TeachingQualification;
import vn.edu.tass.backend.repository.support.JdbcCrudRepository;

@Repository
public class TeachingQualificationRepository extends JdbcCrudRepository<TeachingQualification> {
    public TeachingQualificationRepository(NamedParameterJdbcTemplate jdbc) {
        super(jdbc, TeachingQualification.class);
    }
}
