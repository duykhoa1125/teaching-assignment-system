package vn.edu.tass.backend.payload.dto;

import java.time.LocalDate;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class SubjectDto {
    private Long id;

    private String subjectCode;

    private String name;

    private LocalDate validFrom;

    private LocalDate validTo;
}