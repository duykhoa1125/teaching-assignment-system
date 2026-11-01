package vn.edu.tass.backend.entity;

@SqlTable("education_level")
public record EducationLevel(
    @SqlColumn(writable = false) Long id,
    @SqlColumn String levelCode,
    @SqlColumn String name
) {}
