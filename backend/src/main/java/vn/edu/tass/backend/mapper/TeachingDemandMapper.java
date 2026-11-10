package vn.edu.tass.backend.mapper;

import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.TeachingDemand;
import vn.edu.tass.backend.payload.dto.TeachingDemandDto;
import vn.edu.tass.backend.payload.request.TeachingDemandRequest;

@Component
public class TeachingDemandMapper {
    public TeachingDemand toEntity(TeachingDemandRequest request) {
        TeachingDemand entity = new TeachingDemand();
        applyRequest(request, entity);
        return entity;
    }

    public void applyRequest(TeachingDemandRequest request, TeachingDemand entity) {
        entity.setSemesterId(request.getSemesterId());
        entity.setClassId(request.getClassId());
        entity.setSubjectId(request.getSubjectId());
        entity.setPeriodsPerWeek(request.getPeriodsPerWeek());
        entity.setStatus(request.getStatus());
        entity.setUpdatedBy(request.getUpdatedBy());
        entity.setDemandType(request.getDemandType());
        entity.setValidFrom(request.getValidFrom());
        entity.setValidTo(request.getValidTo());
        entity.setUnit(request.getUnit());
    }

    public TeachingDemandDto toDto(TeachingDemand entity) {
        TeachingDemandDto dto = new TeachingDemandDto();
        dto.setId(entity.getId());
        dto.setSemesterId(entity.getSemesterId());
        dto.setClassId(entity.getClassId());
        dto.setSubjectId(entity.getSubjectId());
        dto.setPeriodsPerWeek(entity.getPeriodsPerWeek());
        dto.setStatus(entity.getStatus());
        dto.setUpdatedBy(entity.getUpdatedBy());
        dto.setUpdatedAt(entity.getUpdatedAt());
        dto.setDemandType(entity.getDemandType());
        dto.setValidFrom(entity.getValidFrom());
        dto.setValidTo(entity.getValidTo());
        dto.setUnit(entity.getUnit());
        return dto;
    }
}
