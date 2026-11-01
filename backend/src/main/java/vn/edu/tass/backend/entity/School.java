package vn.edu.tass.backend.entity;

@SqlTable("school")
public record School(
    @SqlColumn(writable = false) Long id,
    @SqlColumn String schoolCode,
    @SqlColumn String name,
    @SqlColumn String status
) {}
