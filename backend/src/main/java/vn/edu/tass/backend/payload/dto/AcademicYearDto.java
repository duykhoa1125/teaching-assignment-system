package vn.edu.tass.backend.payload.dto;

import java.time.LocalDate;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class AcademicYearDto {
    private Long id;

    private Long schoolId;

    private String yearCode;

    private LocalDate startsOn;

    private LocalDate endsOn;
}