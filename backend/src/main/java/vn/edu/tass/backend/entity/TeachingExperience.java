package vn.edu.tass.backend.entity;

import java.time.OffsetDateTime;

@SqlTable("teaching_experience")
public record TeachingExperience(
    @SqlColumn(writable = false) Long id,
    @SqlColumn Long teacherId,
    @SqlColumn Long subjectId,
    @SqlColumn(required = false) Long gradeId,
    @SqlColumn String experienceLevel,
    @SqlColumn String experiencePeriod,
    @SqlColumn Long recordedBy,
    @SqlColumn(writable = false) OffsetDateTime recordedAt
) {}
