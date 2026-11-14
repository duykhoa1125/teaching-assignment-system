package vn.edu.tass.backend.payload.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.util.List;
import vn.edu.tass.backend.payload.dto.PlanResultDto.*;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record AssignmentMutationDto(VersionContext version,int matchedCount,int changedCount,List<AssignmentRow> items) {}
