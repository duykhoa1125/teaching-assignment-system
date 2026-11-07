package vn.edu.tass.backend.mapper;

import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.RoundSubjectScope;
import vn.edu.tass.backend.payload.dto.RoundSubjectScopeDto;
import vn.edu.tass.backend.payload.request.RoundSubjectScopeRequest;

@Component
public class RoundSubjectScopeMapper {
    public RoundSubjectScope toEntity(RoundSubjectScopeRequest request) {
        RoundSubjectScope entity = new RoundSubjectScope();
        applyRequest(request, entity);
        return entity;
    }

    public void applyRequest(RoundSubjectScopeRequest request, RoundSubjectScope entity) {
        entity.setRoundId(request.getRoundId());
        entity.setGradeId(request.getGradeId());
        entity.setSubjectId(request.getSubjectId());
        entity.setConfirmedBy(request.getConfirmedBy());
        entity.setConfirmedAt(request.getConfirmedAt());
    }

    public RoundSubjectScopeDto toDto(RoundSubjectScope entity) {
        RoundSubjectScopeDto dto = new RoundSubjectScopeDto();
        dto.setId(entity.getId());
        dto.setRoundId(entity.getRoundId());
        dto.setGradeId(entity.getGradeId());
        dto.setSubjectId(entity.getSubjectId());
        dto.setConfirmedBy(entity.getConfirmedBy());
        dto.setConfirmedAt(entity.getConfirmedAt());
        return dto;
    }
}
