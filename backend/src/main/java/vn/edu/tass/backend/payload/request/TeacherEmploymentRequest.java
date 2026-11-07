package vn.edu.tass.backend.payload.request;

import java.time.LocalDate;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class TeacherEmploymentRequest {
    @NotNull
    private Long teacherId;

    @NotNull
    private Long departmentId;

    @NotNull
    private Long semesterId;

    @NotBlank
    private String employmentStatus;

    @NotBlank
    private String positionCode;

    @NotNull
    private LocalDate validFrom;

    private LocalDate validTo;
}