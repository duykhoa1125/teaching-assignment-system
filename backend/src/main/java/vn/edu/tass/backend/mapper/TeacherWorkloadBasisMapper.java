package vn.edu.tass.backend.mapper;

import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.TeacherWorkloadBasis;
import vn.edu.tass.backend.payload.dto.TeacherWorkloadBasisDto;
import vn.edu.tass.backend.payload.request.TeacherWorkloadBasisRequest;

@Component
public class TeacherWorkloadBasisMapper {
    public TeacherWorkloadBasis toEntity(TeacherWorkloadBasisRequest request) {
        TeacherWorkloadBasis entity = new TeacherWorkloadBasis();
        applyRequest(request, entity);
        return entity;
    }

    public void applyRequest(TeacherWorkloadBasisRequest request, TeacherWorkloadBasis entity) {
        entity.setTeacherId(request.getTeacherId());
        entity.setSemesterId(request.getSemesterId());
        entity.setEducationLevelId(request.getEducationLevelId());
        entity.setPositionCode(request.getPositionCode());
        entity.setBasePeriodsPerWeek(request.getBasePeriodsPerWeek());
        entity.setUnit(request.getUnit());
        entity.setValidFrom(request.getValidFrom());
        entity.setValidTo(request.getValidTo());
        entity.setProfileRef(request.getProfileRef());
        entity.setRuleDefinitionId(request.getRuleDefinitionId());
        entity.setSourceImportId(request.getSourceImportId());
        entity.setVerificationStatus(request.getVerificationStatus());
        entity.setVerifiedBy(request.getVerifiedBy());
        entity.setVerifiedAt(request.getVerifiedAt());
    }

    public TeacherWorkloadBasisDto toDto(TeacherWorkloadBasis entity) {
        TeacherWorkloadBasisDto dto = new TeacherWorkloadBasisDto();
        dto.setId(entity.getId());
        dto.setTeacherId(entity.getTeacherId());
        dto.setSemesterId(entity.getSemesterId());
        dto.setEducationLevelId(entity.getEducationLevelId());
        dto.setPositionCode(entity.getPositionCode());
        dto.setBasePeriodsPerWeek(entity.getBasePeriodsPerWeek());
        dto.setUnit(entity.getUnit());
        dto.setValidFrom(entity.getValidFrom());
        dto.setValidTo(entity.getValidTo());
        dto.setProfileRef(entity.getProfileRef());
        dto.setRuleDefinitionId(entity.getRuleDefinitionId());
        dto.setSourceImportId(entity.getSourceImportId());
        dto.setVerificationStatus(entity.getVerificationStatus());
        dto.setVerifiedBy(entity.getVerifiedBy());
        dto.setVerifiedAt(entity.getVerifiedAt());
        return dto;
    }
}
