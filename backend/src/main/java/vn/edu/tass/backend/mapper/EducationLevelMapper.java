package vn.edu.tass.backend.mapper;

import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.EducationLevel;
import vn.edu.tass.backend.payload.dto.EducationLevelDto;
import vn.edu.tass.backend.payload.request.EducationLevelRequest;

@Component
public class EducationLevelMapper {
    public EducationLevel toEntity(EducationLevelRequest request) {
        EducationLevel entity = new EducationLevel();
        applyRequest(request, entity);
        return entity;
    }

    public void applyRequest(EducationLevelRequest request, EducationLevel entity) {
        entity.setLevelCode(request.getLevelCode());
        entity.setName(request.getName());
    }

    public EducationLevelDto toDto(EducationLevel entity) {
        EducationLevelDto dto = new EducationLevelDto();
        dto.setId(entity.getId());
        dto.setLevelCode(entity.getLevelCode());
        dto.setName(entity.getName());
        return dto;
    }
}
