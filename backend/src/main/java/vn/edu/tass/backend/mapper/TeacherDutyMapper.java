package vn.edu.tass.backend.mapper;

import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.TeacherDuty;
import vn.edu.tass.backend.payload.dto.TeacherDutyDto;
import vn.edu.tass.backend.payload.request.TeacherDutyRequest;

@Component
public class TeacherDutyMapper {
    public TeacherDuty toEntity(TeacherDutyRequest request) {
        TeacherDuty entity = new TeacherDuty();
        applyRequest(request, entity);
        return entity;
    }

    public void applyRequest(TeacherDutyRequest request, TeacherDuty entity) {
        entity.setTeacherId(request.getTeacherId());
        entity.setSemesterId(request.getSemesterId());
        entity.setRuleDefinitionId(request.getRuleDefinitionId());
        entity.setDutyType(request.getDutyType());
        entity.setClassId(request.getClassId());
        entity.setScopeDescription(request.getScopeDescription());
        entity.setValidFrom(request.getValidFrom());
        entity.setValidTo(request.getValidTo());
        entity.setReductionValue(request.getReductionValue());
        entity.setVerificationStatus(request.getVerificationStatus());
        entity.setPaymentStatus(request.getPaymentStatus());
        entity.setEvidenceRef(request.getEvidenceRef());
        entity.setVerifiedBy(request.getVerifiedBy());
    }

    public TeacherDutyDto toDto(TeacherDuty entity) {
        TeacherDutyDto dto = new TeacherDutyDto();
        dto.setId(entity.getId());
        dto.setTeacherId(entity.getTeacherId());
        dto.setSemesterId(entity.getSemesterId());
        dto.setRuleDefinitionId(entity.getRuleDefinitionId());
        dto.setDutyType(entity.getDutyType());
        dto.setClassId(entity.getClassId());
        dto.setScopeDescription(entity.getScopeDescription());
        dto.setValidFrom(entity.getValidFrom());
        dto.setValidTo(entity.getValidTo());
        dto.setReductionValue(entity.getReductionValue());
        dto.setVerificationStatus(entity.getVerificationStatus());
        dto.setPaymentStatus(entity.getPaymentStatus());
        dto.setEvidenceRef(entity.getEvidenceRef());
        dto.setVerifiedBy(entity.getVerifiedBy());
        return dto;
    }
}
