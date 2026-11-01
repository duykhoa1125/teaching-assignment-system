package vn.edu.tass.backend.repository;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.tass.backend.entity.TeachingExperience;
import vn.edu.tass.backend.repository.support.JdbcCrudRepository;

@Repository
public class TeachingExperienceRepository extends JdbcCrudRepository<TeachingExperience> {
    public TeachingExperienceRepository(NamedParameterJdbcTemplate jdbc) {
        super(jdbc, TeachingExperience.class);
    }
}
