package vn.edu.tass.backend.repository;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.tass.backend.entity.TeachingDemand;
import vn.edu.tass.backend.repository.support.JdbcCrudRepository;

@Repository
public class TeachingDemandRepository extends JdbcCrudRepository<TeachingDemand> {
    public TeachingDemandRepository(NamedParameterJdbcTemplate jdbc) {
        super(jdbc, TeachingDemand.class);
    }
}
