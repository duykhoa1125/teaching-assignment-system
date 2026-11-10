package vn.edu.tass.backend.payload.dto;

import java.util.List;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TeacherProfileDto(
    TeacherDto teacher,
    SemesterDto semester,
    List<TeacherEmploymentDto> employments,
    List<TeachingQualificationDto> qualifications,
    List<TeachingExperienceDto> experiences,
    List<TeachingHistoryDto> teachingHistories,
    List<TeacherWorkloadBasisDto> workloadBases,
    List<TeacherDutyDto> duties
) {
}
