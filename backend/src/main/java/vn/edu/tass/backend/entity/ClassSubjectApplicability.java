package vn.edu.tass.backend.entity;

import java.time.OffsetDateTime;

@SqlTable("class_subject_applicability")
public record ClassSubjectApplicability(
    @SqlColumn(writable = false) Long id,
    @SqlColumn Long scopeId,
    @SqlColumn Long classId,
    @SqlColumn String status,
    @SqlColumn(required = false) String reason,
    @SqlColumn Long updatedBy,
    @SqlColumn(writable = false) OffsetDateTime updatedAt
) {}
