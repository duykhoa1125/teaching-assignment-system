package vn.edu.tass.backend.mapper;

import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.TeachingHistory;
import vn.edu.tass.backend.payload.dto.TeachingHistoryDto;
import vn.edu.tass.backend.payload.request.TeachingHistoryRequest;

@Component
public class TeachingHistoryMapper {
    public TeachingHistory toEntity(TeachingHistoryRequest request) {
        TeachingHistory entity = new TeachingHistory();
        applyRequest(request, entity);
        return entity;
    }

    public void applyRequest(TeachingHistoryRequest request, TeachingHistory entity) {
        entity.setTeacherId(request.getTeacherId());
        entity.setAcademicYearId(request.getAcademicYearId());
        entity.setSemesterId(request.getSemesterId());
        entity.setClassId(request.getClassId());
        entity.setSubjectId(request.getSubjectId());
        entity.setTaughtFrom(request.getTaughtFrom());
        entity.setTaughtTo(request.getTaughtTo());
        entity.setSourceKind(request.getSourceKind());
        entity.setSourceImportId(request.getSourceImportId());
        entity.setSourcePlanDemandId(request.getSourcePlanDemandId());
        entity.setEvidenceRef(request.getEvidenceRef());
        entity.setVerificationStatus(request.getVerificationStatus());
        entity.setVerifiedBy(request.getVerifiedBy());
        entity.setVerifiedAt(request.getVerifiedAt());
        entity.setRecordedBy(request.getRecordedBy());
    }

    public TeachingHistoryDto toDto(TeachingHistory entity) {
        TeachingHistoryDto dto = new TeachingHistoryDto();
        dto.setId(entity.getId());
        dto.setTeacherId(entity.getTeacherId());
        dto.setAcademicYearId(entity.getAcademicYearId());
        dto.setSemesterId(entity.getSemesterId());
        dto.setClassId(entity.getClassId());
        dto.setSubjectId(entity.getSubjectId());
        dto.setTaughtFrom(entity.getTaughtFrom());
        dto.setTaughtTo(entity.getTaughtTo());
        dto.setSourceKind(entity.getSourceKind());
        dto.setSourceImportId(entity.getSourceImportId());
        dto.setSourcePlanDemandId(entity.getSourcePlanDemandId());
        dto.setEvidenceRef(entity.getEvidenceRef());
        dto.setVerificationStatus(entity.getVerificationStatus());
        dto.setVerifiedBy(entity.getVerifiedBy());
        dto.setVerifiedAt(entity.getVerifiedAt());
        dto.setRecordedBy(entity.getRecordedBy());
        dto.setRecordedAt(entity.getRecordedAt());
        return dto;
    }
}
