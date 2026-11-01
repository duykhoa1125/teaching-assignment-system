package vn.edu.tass.backend.entity;

import java.time.LocalDate;

@SqlTable("department")
public record Department(
    @SqlColumn(writable = false) Long id,
    @SqlColumn Long schoolId,
    @SqlColumn String departmentCode,
    @SqlColumn String name,
    @SqlColumn LocalDate validFrom,
    @SqlColumn(required = false) LocalDate validTo
) {}
