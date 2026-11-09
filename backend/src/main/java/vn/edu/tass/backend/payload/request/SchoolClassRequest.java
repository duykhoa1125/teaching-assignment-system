package vn.edu.tass.backend.payload.request;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class SchoolClassRequest {
    @NotNull
    @Positive
    private Long academicYearId;

    @NotNull
    @Positive
    private Long gradeId;

    @NotBlank
    @Size(max = 50)
    private String classCode;

    @NotBlank
    @Size(max = 40)
    private String status;
}
