package vn.edu.tass.backend.mapper;

import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.AssignmentRound;
import vn.edu.tass.backend.payload.dto.AssignmentRoundDto;
import vn.edu.tass.backend.payload.request.AssignmentRoundRequest;

@Component
public class AssignmentRoundMapper {
    public AssignmentRound toEntity(AssignmentRoundRequest request) {
        AssignmentRound entity = new AssignmentRound();
        applyRequest(request, entity);
        return entity;
    }

    public void applyRequest(AssignmentRoundRequest request, AssignmentRound entity) {
        entity.setSemesterId(request.getSemesterId());
        entity.setRoundCode(request.getRoundCode());
        entity.setStatus(request.getStatus());
        entity.setScopeConfirmedBy(request.getScopeConfirmedBy());
        entity.setScopeConfirmedAt(request.getScopeConfirmedAt());
        entity.setOpensAt(request.getOpensAt());
        entity.setClosesAt(request.getClosesAt());
    }

    public AssignmentRoundDto toDto(AssignmentRound entity) {
        AssignmentRoundDto dto = new AssignmentRoundDto();
        dto.setId(entity.getId());
        dto.setSemesterId(entity.getSemesterId());
        dto.setRoundCode(entity.getRoundCode());
        dto.setStatus(entity.getStatus());
        dto.setScopeConfirmedBy(entity.getScopeConfirmedBy());
        dto.setScopeConfirmedAt(entity.getScopeConfirmedAt());
        dto.setOpensAt(entity.getOpensAt());
        dto.setClosesAt(entity.getClosesAt());
        return dto;
    }
}
