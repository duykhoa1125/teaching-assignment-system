package vn.edu.tass.backend.repository;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.tass.backend.entity.RoundSubjectScope;
import vn.edu.tass.backend.repository.support.JdbcCrudRepository;

@Repository
public class RoundSubjectScopeRepository extends JdbcCrudRepository<RoundSubjectScope> {
    public RoundSubjectScopeRepository(NamedParameterJdbcTemplate jdbc) {
        super(jdbc, RoundSubjectScope.class);
    }
}
