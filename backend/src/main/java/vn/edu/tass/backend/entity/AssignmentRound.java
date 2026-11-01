package vn.edu.tass.backend.entity;

import java.time.OffsetDateTime;

@SqlTable("assignment_round")
public record AssignmentRound(
    @SqlColumn(writable = false) Long id,
    @SqlColumn Long semesterId,
    @SqlColumn String roundCode,
    @SqlColumn String status,
    @SqlColumn(required = false) Long scopeConfirmedBy,
    @SqlColumn(required = false) OffsetDateTime scopeConfirmedAt,
    @SqlColumn(required = false) OffsetDateTime opensAt,
    @SqlColumn(required = false) OffsetDateTime closesAt
) {}
