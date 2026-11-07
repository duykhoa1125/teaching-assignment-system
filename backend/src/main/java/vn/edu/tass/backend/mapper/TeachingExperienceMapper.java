package vn.edu.tass.backend.mapper;

import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.TeachingExperience;
import vn.edu.tass.backend.payload.dto.TeachingExperienceDto;
import vn.edu.tass.backend.payload.request.TeachingExperienceRequest;

@Component
public class TeachingExperienceMapper {
    public TeachingExperience toEntity(TeachingExperienceRequest request) {
        TeachingExperience entity = new TeachingExperience();
        applyRequest(request, entity);
        return entity;
    }

    public void applyRequest(TeachingExperienceRequest request, TeachingExperience entity) {
        entity.setTeacherId(request.getTeacherId());
        entity.setSubjectId(request.getSubjectId());
        entity.setGradeId(request.getGradeId());
        entity.setExperienceLevel(request.getExperienceLevel());
        entity.setExperiencePeriod(request.getExperiencePeriod());
        entity.setRecordedBy(request.getRecordedBy());
    }

    public TeachingExperienceDto toDto(TeachingExperience entity) {
        TeachingExperienceDto dto = new TeachingExperienceDto();
        dto.setId(entity.getId());
        dto.setTeacherId(entity.getTeacherId());
        dto.setSubjectId(entity.getSubjectId());
        dto.setGradeId(entity.getGradeId());
        dto.setExperienceLevel(entity.getExperienceLevel());
        dto.setExperiencePeriod(entity.getExperiencePeriod());
        dto.setRecordedBy(entity.getRecordedBy());
        dto.setRecordedAt(entity.getRecordedAt());
        return dto;
    }
}
