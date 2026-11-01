package vn.edu.tass.backend.mapper;

import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.SchoolClass;
import vn.edu.tass.backend.payload.dto.SchoolClassDto;
import vn.edu.tass.backend.payload.request.SchoolClassRequest;

@Component
public class SchoolClassMapper {
    public SchoolClass toEntity(SchoolClassRequest request) {
        SchoolClass entity = new SchoolClass();
        applyRequest(request, entity);
        return entity;
    }

    public void applyRequest(SchoolClassRequest request, SchoolClass entity) {
        entity.setAcademicYearId(request.getAcademicYearId());
        entity.setGradeId(request.getGradeId());
        entity.setClassCode(request.getClassCode());
        entity.setStatus(request.getStatus());
    }

    public SchoolClassDto toDto(SchoolClass entity) {
        SchoolClassDto dto = new SchoolClassDto();
        dto.setId(entity.getId());
        dto.setAcademicYearId(entity.getAcademicYearId());
        dto.setGradeId(entity.getGradeId());
        dto.setClassCode(entity.getClassCode());
        dto.setStatus(entity.getStatus());
        return dto;
    }
}
