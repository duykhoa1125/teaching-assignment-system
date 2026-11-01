package vn.edu.tass.backend.mapper;

import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.Teacher;
import vn.edu.tass.backend.payload.dto.TeacherDto;
import vn.edu.tass.backend.payload.request.TeacherRequest;

@Component
public class TeacherMapper {
    public Teacher toEntity(TeacherRequest request) {
        Teacher entity = new Teacher();
        applyRequest(request, entity);
        return entity;
    }

    public void applyRequest(TeacherRequest request, Teacher entity) {
        entity.setSchoolId(request.getSchoolId());
        entity.setTeacherCode(request.getTeacherCode());
        entity.setFullName(request.getFullName());
    }

    public TeacherDto toDto(Teacher entity) {
        TeacherDto dto = new TeacherDto();
        dto.setId(entity.getId());
        dto.setSchoolId(entity.getSchoolId());
        dto.setTeacherCode(entity.getTeacherCode());
        dto.setFullName(entity.getFullName());
        return dto;
    }
}
