package vn.edu.tass.backend.mapper;

import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.TeacherEmployment;
import vn.edu.tass.backend.payload.dto.TeacherEmploymentDto;
import vn.edu.tass.backend.payload.request.TeacherEmploymentRequest;

@Component
public class TeacherEmploymentMapper {
    public TeacherEmployment toEntity(TeacherEmploymentRequest request) {
        TeacherEmployment entity = new TeacherEmployment();
        applyRequest(request, entity);
        return entity;
    }

    public void applyRequest(TeacherEmploymentRequest request, TeacherEmployment entity) {
        entity.setTeacherId(request.getTeacherId());
        entity.setDepartmentId(request.getDepartmentId());
        entity.setSemesterId(request.getSemesterId());
        entity.setEmploymentStatus(request.getEmploymentStatus());
        entity.setPositionCode(request.getPositionCode());
        entity.setValidFrom(request.getValidFrom());
        entity.setValidTo(request.getValidTo());
    }

    public TeacherEmploymentDto toDto(TeacherEmployment entity) {
        TeacherEmploymentDto dto = new TeacherEmploymentDto();
        dto.setId(entity.getId());
        dto.setTeacherId(entity.getTeacherId());
        dto.setDepartmentId(entity.getDepartmentId());
        dto.setSemesterId(entity.getSemesterId());
        dto.setEmploymentStatus(entity.getEmploymentStatus());
        dto.setPositionCode(entity.getPositionCode());
        dto.setValidFrom(entity.getValidFrom());
        dto.setValidTo(entity.getValidTo());
        return dto;
    }
}
