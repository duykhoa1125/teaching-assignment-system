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
        entity.setRecordedBy(request.getRecordedBy());
        entity.setExperienceStatus(request.getExperienceStatus());
        entity.setYearsOfExperience(request.getYearsOfExperience());
        entity.setAsOfDate(request.getAsOfDate());
        entity.setEvidenceRef(request.getEvidenceRef());
        entity.setSourceImportId(request.getSourceImportId());
        entity.setVerifiedBy(request.getVerifiedBy());
        entity.setVerifiedAt(request.getVerifiedAt());
    }

    public TeachingExperienceDto toDto(TeachingExperience entity) {
        TeachingExperienceDto dto = new TeachingExperienceDto();
        dto.setId(entity.getId());
        dto.setTeacherId(entity.getTeacherId());
        dto.setSubjectId(entity.getSubjectId());
        dto.setGradeId(entity.getGradeId());
        dto.setRecordedBy(entity.getRecordedBy());
        dto.setRecordedAt(entity.getRecordedAt());
        dto.setExperienceStatus(entity.getExperienceStatus());
        dto.setYearsOfExperience(entity.getYearsOfExperience());
        dto.setAsOfDate(entity.getAsOfDate());
        dto.setEvidenceRef(entity.getEvidenceRef());
        dto.setSourceImportId(entity.getSourceImportId());
        dto.setVerifiedBy(entity.getVerifiedBy());
        dto.setVerifiedAt(entity.getVerifiedAt());
        return dto;
    }
}
