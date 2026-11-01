package vn.edu.tass.backend.entity;

@SqlTable("teacher")
public record Teacher(
    @SqlColumn(writable = false) Long id,
    @SqlColumn Long schoolId,
    @SqlColumn String teacherCode,
    @SqlColumn String fullName
) {}
