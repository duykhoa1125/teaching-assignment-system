package vn.edu.tass.backend.entity;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@SqlTable("teaching_qualification")
public record TeachingQualification(
    @SqlColumn(writable = false) Long id,
    @SqlColumn Long teacherId,
    @SqlColumn Long subjectId,
    @SqlColumn Long educationLevelId,
    @SqlColumn String verificationStatus,
    @SqlColumn(required = false) Long verifiedBy,
    @SqlColumn(required = false) OffsetDateTime verifiedAt,
    @SqlColumn(required = false) String evidenceRef,
    @SqlColumn LocalDate validFrom,
    @SqlColumn(required = false) LocalDate validTo
) {}
