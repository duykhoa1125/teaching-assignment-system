package vn.edu.tass.backend.payload.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import vn.edu.tass.backend.entity.Teacher;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TeacherDto(
    Long id,
    Long schoolId,
    String teacherCode,
    String fullName
) {
    public static TeacherDto from(Teacher entity) {
        return new TeacherDto(entity.id(), entity.schoolId(), entity.teacherCode(), entity.fullName());
    }
}
