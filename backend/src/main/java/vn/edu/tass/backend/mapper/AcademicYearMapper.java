package vn.edu.tass.backend.mapper;

import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.AcademicYear;
import vn.edu.tass.backend.payload.dto.AcademicYearDto;
import vn.edu.tass.backend.payload.request.AcademicYearRequest;

@Component
public class AcademicYearMapper {
    public AcademicYear toEntity(AcademicYearRequest request) {
        AcademicYear entity = new AcademicYear();
        applyRequest(request, entity);
        return entity;
    }

    public void applyRequest(AcademicYearRequest request, AcademicYear entity) {
        entity.setSchoolId(request.getSchoolId());
        entity.setYearCode(request.getYearCode());
        entity.setStartsOn(request.getStartsOn());
        entity.setEndsOn(request.getEndsOn());
    }

    public AcademicYearDto toDto(AcademicYear entity) {
        AcademicYearDto dto = new AcademicYearDto();
        dto.setId(entity.getId());
        dto.setSchoolId(entity.getSchoolId());
        dto.setYearCode(entity.getYearCode());
        dto.setStartsOn(entity.getStartsOn());
        dto.setEndsOn(entity.getEndsOn());
        return dto;
    }
}
