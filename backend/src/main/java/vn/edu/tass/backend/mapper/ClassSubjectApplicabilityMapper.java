package vn.edu.tass.backend.mapper;

import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.ClassSubjectApplicability;
import vn.edu.tass.backend.payload.dto.ClassSubjectApplicabilityDto;
import vn.edu.tass.backend.payload.request.ClassSubjectApplicabilityRequest;

@Component
public class ClassSubjectApplicabilityMapper {
    public ClassSubjectApplicability toEntity(ClassSubjectApplicabilityRequest request) {
        ClassSubjectApplicability entity = new ClassSubjectApplicability();
        applyRequest(request, entity);
        return entity;
    }

    public void applyRequest(ClassSubjectApplicabilityRequest request, ClassSubjectApplicability entity) {
        entity.setScopeId(request.getScopeId());
        entity.setClassId(request.getClassId());
        entity.setStatus(request.getStatus());
        entity.setReason(request.getReason());
        entity.setUpdatedBy(request.getUpdatedBy());
    }

    public ClassSubjectApplicabilityDto toDto(ClassSubjectApplicability entity) {
        ClassSubjectApplicabilityDto dto = new ClassSubjectApplicabilityDto();
        dto.setId(entity.getId());
        dto.setScopeId(entity.getScopeId());
        dto.setClassId(entity.getClassId());
        dto.setStatus(entity.getStatus());
        dto.setReason(entity.getReason());
        dto.setUpdatedBy(entity.getUpdatedBy());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }
}
