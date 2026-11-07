package vn.edu.tass.backend.mapper;

import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.Grade;
import vn.edu.tass.backend.payload.dto.GradeDto;
import vn.edu.tass.backend.payload.request.GradeRequest;

@Component
public class GradeMapper {
    public Grade toEntity(GradeRequest request) {
        Grade entity = new Grade();
        applyRequest(request, entity);
        return entity;
    }

    public void applyRequest(GradeRequest request, Grade entity) {
        entity.setEducationLevelId(request.getEducationLevelId());
        entity.setGradeCode(request.getGradeCode());
        entity.setName(request.getName());
    }

    public GradeDto toDto(Grade entity) {
        GradeDto dto = new GradeDto();
        dto.setId(entity.getId());
        dto.setEducationLevelId(entity.getEducationLevelId());
        dto.setGradeCode(entity.getGradeCode());
        dto.setName(entity.getName());
        return dto;
    }
}
