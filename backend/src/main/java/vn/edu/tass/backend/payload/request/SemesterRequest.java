package vn.edu.tass.backend.payload.request;

import java.time.LocalDate;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Max;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class SemesterRequest {
    @NotNull
    @Positive
    private Long academicYearId;

    @NotNull
    @Positive
    @Max(32767)
    private Integer semesterNo;

    @NotNull
    private LocalDate startsOn;

    @NotNull
    private LocalDate endsOn;
}
