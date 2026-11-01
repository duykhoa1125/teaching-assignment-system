package vn.edu.tass.backend.entity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@SqlTable("teaching_demand")
public record TeachingDemand(
    @SqlColumn(writable = false) Long id,
    @SqlColumn Long semesterId,
    @SqlColumn Long classId,
    @SqlColumn Long subjectId,
    @SqlColumn BigDecimal periodsPerWeek,
    @SqlColumn String status,
    @SqlColumn Long updatedBy,
    @SqlColumn(writable = false) OffsetDateTime updatedAt,
    @SqlColumn String demandType
) {}
