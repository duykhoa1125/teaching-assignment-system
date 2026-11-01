package vn.edu.tass.backend.repository;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.tass.backend.entity.EducationLevel;
import vn.edu.tass.backend.repository.support.JdbcCrudRepository;

@Repository
public class EducationLevelRepository extends JdbcCrudRepository<EducationLevel> {
    public EducationLevelRepository(NamedParameterJdbcTemplate jdbc) {
        super(jdbc, EducationLevel.class);
    }
}
