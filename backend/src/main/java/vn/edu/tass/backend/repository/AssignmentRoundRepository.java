package vn.edu.tass.backend.repository;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.tass.backend.entity.AssignmentRound;
import vn.edu.tass.backend.repository.support.JdbcCrudRepository;

@Repository
public class AssignmentRoundRepository extends JdbcCrudRepository<AssignmentRound> {
    public AssignmentRoundRepository(NamedParameterJdbcTemplate jdbc) {
        super(jdbc, AssignmentRound.class);
    }
}
