package vn.edu.tass.backend.payload.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class RequiredDemandComponentDto {
    private Long id;
    private Long applicabilityId;
    private String demandType;
    private LocalDate validFrom;
    private LocalDate validTo;
    private Long demandId;
    private Long confirmedBy;
    private OffsetDateTime confirmedAt;
}
