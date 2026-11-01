package vn.edu.tass.backend.entity;

import java.time.LocalDate;

@SqlTable("subject")
public record Subject(
    @SqlColumn(writable = false) Long id,
    @SqlColumn String subjectCode,
    @SqlColumn String name,
    @SqlColumn LocalDate validFrom,
    @SqlColumn(required = false) LocalDate validTo
) {}
