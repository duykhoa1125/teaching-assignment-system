package vn.edu.tass.backend.mapper;

import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.TeachingQualification;
import vn.edu.tass.backend.payload.dto.TeachingQualificationDto;
import vn.edu.tass.backend.payload.request.TeachingQualificationRequest;

@Component
public class TeachingQualificationMapper {
    public TeachingQualification toEntity(TeachingQualificationRequest request) {
        TeachingQualification entity = new TeachingQualification();
        applyRequest(request, entity);
        return entity;
    }

    public void applyRequest(TeachingQualificationRequest request, TeachingQualification entity) {
        entity.setTeacherId(request.getTeacherId());
        entity.setSubjectId(request.getSubjectId());
        entity.setEducationLevelId(request.getEducationLevelId());
        entity.setVerificationStatus(request.getVerificationStatus());
        entity.setVerifiedBy(request.getVerifiedBy());
        entity.setVerifiedAt(request.getVerifiedAt());
        entity.setEvidenceRef(request.getEvidenceRef());
        entity.setValidFrom(request.getValidFrom());
        entity.setValidTo(request.getValidTo());
    }

    public TeachingQualificationDto toDto(TeachingQualification entity) {
        TeachingQualificationDto dto = new TeachingQualificationDto();
        dto.setId(entity.getId());
        dto.setTeacherId(entity.getTeacherId());
        dto.setSubjectId(entity.getSubjectId());
        dto.setEducationLevelId(entity.getEducationLevelId());
        dto.setVerificationStatus(entity.getVerificationStatus());
        dto.setVerifiedBy(entity.getVerifiedBy());
        dto.setVerifiedAt(entity.getVerifiedAt());
        dto.setEvidenceRef(entity.getEvidenceRef());
        dto.setValidFrom(entity.getValidFrom());
        dto.setValidTo(entity.getValidTo());
        return dto;
    }
}
