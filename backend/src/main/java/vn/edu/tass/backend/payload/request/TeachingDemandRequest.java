package vn.edu.tass.backend.payload.request;

import java.math.BigDecimal;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TeachingDemandRequest(
    Long semesterId,
    Long classId,
    Long subjectId,
    BigDecimal periodsPerWeek,
    String status,
    Long updatedBy,
    String demandType
) {}
