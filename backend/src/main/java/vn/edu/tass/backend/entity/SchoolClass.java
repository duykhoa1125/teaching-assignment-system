package vn.edu.tass.backend.entity;

@SqlTable("school_class")
public record SchoolClass(
    @SqlColumn(writable = false) Long id,
    @SqlColumn Long academicYearId,
    @SqlColumn Long gradeId,
    @SqlColumn String classCode,
    @SqlColumn String status
) {}
