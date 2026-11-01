package vn.edu.tass.backend.payload.dto;

import java.time.OffsetDateTime;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class AssignmentRoundDto {
    private Long id;

    private Long semesterId;

    private String roundCode;

    private String status;

    private Long scopeConfirmedBy;

    private OffsetDateTime scopeConfirmedAt;

    private OffsetDateTime opensAt;

    private OffsetDateTime closesAt;
}