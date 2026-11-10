package vn.edu.tass.backend.payload.request;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Data
@NoArgsConstructor
public class SchoolRequest {
    @NotBlank
    @Size(max = 50)
    private String schoolCode;

    @NotBlank
    @Size(max = 255)
    private String name;

    @NotBlank
    @Size(max = 40)
    private String status;
}
