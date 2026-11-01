package vn.edu.tass.backend.entity;

import java.time.LocalDate;

@SqlTable("semester")
public record Semester(
    @SqlColumn(writable = false) Long id,
    @SqlColumn Long academicYearId,
    @SqlColumn Integer semesterNo,
    @SqlColumn LocalDate startsOn,
    @SqlColumn LocalDate endsOn
) {}
