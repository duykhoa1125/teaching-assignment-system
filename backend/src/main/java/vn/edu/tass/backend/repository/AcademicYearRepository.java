package vn.edu.tass.backend.repository;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import vn.edu.tass.backend.entity.AcademicYear;
import vn.edu.tass.backend.repository.support.JdbcCrudRepository;

@Repository
public class AcademicYearRepository extends JdbcCrudRepository<AcademicYear> {
    public AcademicYearRepository(NamedParameterJdbcTemplate jdbc) {
        super(jdbc, AcademicYear.class);
    }
}
