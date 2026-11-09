package vn.edu.tass.backend.mapper;

import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.RequiredDemandComponent;
import vn.edu.tass.backend.payload.dto.RequiredDemandComponentDto;
import vn.edu.tass.backend.payload.request.RequiredDemandComponentRequest;

@Component
public class RequiredDemandComponentMapper {
    public RequiredDemandComponent toEntity(RequiredDemandComponentRequest request) {
        RequiredDemandComponent entity = new RequiredDemandComponent();
        applyRequest(request, entity);
        return entity;
    }

    public void applyRequest(RequiredDemandComponentRequest request, RequiredDemandComponent entity) {
        entity.setApplicabilityId(request.getApplicabilityId());
        entity.setDemandType(request.getDemandType());
        entity.setValidFrom(request.getValidFrom());
        entity.setValidTo(request.getValidTo());
        entity.setDemandId(request.getDemandId());
        entity.setConfirmedBy(request.getConfirmedBy());
        entity.setConfirmedAt(request.getConfirmedAt());
    }

    public RequiredDemandComponentDto toDto(RequiredDemandComponent entity) {
        RequiredDemandComponentDto dto = new RequiredDemandComponentDto();
        dto.setId(entity.getId());
        dto.setApplicabilityId(entity.getApplicabilityId());
        dto.setDemandType(entity.getDemandType());
        dto.setValidFrom(entity.getValidFrom());
        dto.setValidTo(entity.getValidTo());
        dto.setDemandId(entity.getDemandId());
        dto.setConfirmedBy(entity.getConfirmedBy());
        dto.setConfirmedAt(entity.getConfirmedAt());
        return dto;
    }
}
