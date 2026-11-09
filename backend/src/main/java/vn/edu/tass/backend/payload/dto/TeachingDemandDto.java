package vn.edu.tass.backend.payload.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class TeachingDemandDto {
    private Long id;

    private Long semesterId;

    private Long classId;

    private Long subjectId;

    private BigDecimal periodsPerWeek;

    private String status;

    private Long updatedBy;

    private OffsetDateTime updatedAt;

    private String demandType;

    private LocalDate validFrom;

    private LocalDate validTo;

    private String unit;
}
