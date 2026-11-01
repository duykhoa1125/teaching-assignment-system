package vn.edu.tass.backend.payload.request;

import java.time.LocalDate;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class SemesterRequest {
    @NotNull
    private Long academicYearId;

    @NotNull
    private Integer semesterNo;

    @NotNull
    private LocalDate startsOn;

    @NotNull
    private LocalDate endsOn;
}