package vn.edu.tass.backend.payload.request;

import java.time.LocalDate;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class TeacherEmploymentRequest {
    @NotNull
    @Positive
    private Long teacherId;

    @NotNull
    @Positive
    private Long departmentId;

    @NotNull
    @Positive
    private Long semesterId;

    @NotBlank
    @Size(max = 40)
    @Schema(allowableValues = {"TEACHING", "ON_LEAVE", "INACTIVE"})
    private String employmentStatus;

    @NotBlank
    @Size(max = 50)
    private String positionCode;

    @NotNull
    private LocalDate validFrom;

    private LocalDate validTo;
}
