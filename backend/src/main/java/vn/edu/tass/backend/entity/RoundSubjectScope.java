package vn.edu.tass.backend.entity;

import java.time.OffsetDateTime;

@SqlTable("round_subject_scope")
public record RoundSubjectScope(
    @SqlColumn(writable = false) Long id,
    @SqlColumn Long roundId,
    @SqlColumn Long gradeId,
    @SqlColumn Long subjectId,
    @SqlColumn(required = false) Long confirmedBy,
    @SqlColumn(required = false) OffsetDateTime confirmedAt
) {}
