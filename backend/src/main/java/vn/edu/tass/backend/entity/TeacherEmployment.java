package vn.edu.tass.backend.entity;

import java.time.LocalDate;

@SqlTable("teacher_employment")
public record TeacherEmployment(
    @SqlColumn(writable = false) Long id,
    @SqlColumn Long teacherId,
    @SqlColumn Long departmentId,
    @SqlColumn Long semesterId,
    @SqlColumn String employmentStatus,
    @SqlColumn String positionCode,
    @SqlColumn LocalDate validFrom,
    @SqlColumn(required = false) LocalDate validTo
) {}
