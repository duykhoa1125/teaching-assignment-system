package vn.edu.tass.backend.mapper;

import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.Department;
import vn.edu.tass.backend.payload.dto.DepartmentDto;
import vn.edu.tass.backend.payload.request.DepartmentRequest;

@Component
public class DepartmentMapper {
    public Department toEntity(DepartmentRequest request) {
        Department entity = new Department();
        applyRequest(request, entity);
        return entity;
    }

    public void applyRequest(DepartmentRequest request, Department entity) {
        entity.setSchoolId(request.getSchoolId());
        entity.setDepartmentCode(request.getDepartmentCode());
        entity.setName(request.getName());
        entity.setValidFrom(request.getValidFrom());
        entity.setValidTo(request.getValidTo());
    }

    public DepartmentDto toDto(Department entity) {
        DepartmentDto dto = new DepartmentDto();
        dto.setId(entity.getId());
        dto.setSchoolId(entity.getSchoolId());
        dto.setDepartmentCode(entity.getDepartmentCode());
        dto.setName(entity.getName());
        dto.setValidFrom(entity.getValidFrom());
        dto.setValidTo(entity.getValidTo());
        return dto;
    }
}
