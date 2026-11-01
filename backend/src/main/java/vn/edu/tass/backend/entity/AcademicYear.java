package vn.edu.tass.backend.entity;

import java.time.LocalDate;

@SqlTable("academic_year")
public record AcademicYear(
    @SqlColumn(writable = false) Long id,
    @SqlColumn Long schoolId,
    @SqlColumn String yearCode,
    @SqlColumn LocalDate startsOn,
    @SqlColumn LocalDate endsOn
) {}
