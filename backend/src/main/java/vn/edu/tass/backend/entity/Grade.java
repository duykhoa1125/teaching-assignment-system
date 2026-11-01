package vn.edu.tass.backend.entity;

@SqlTable("grade")
public record Grade(
    @SqlColumn(writable = false) Long id,
    @SqlColumn Long educationLevelId,
    @SqlColumn String gradeCode,
    @SqlColumn String name
) {}
