package vn.edu.tass.backend.mapper;

import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.Semester;
import vn.edu.tass.backend.payload.dto.SemesterDto;
import vn.edu.tass.backend.payload.request.SemesterRequest;

@Component
public class SemesterMapper {
    public Semester toEntity(SemesterRequest request) {
        Semester entity = new Semester();
        applyRequest(request, entity);
        return entity;
    }

    public void applyRequest(SemesterRequest request, Semester entity) {
        entity.setAcademicYearId(request.getAcademicYearId());
        entity.setSemesterNo(request.getSemesterNo());
        entity.setStartsOn(request.getStartsOn());
        entity.setEndsOn(request.getEndsOn());
    }

    public SemesterDto toDto(Semester entity) {
        SemesterDto dto = new SemesterDto();
        dto.setId(entity.getId());
        dto.setAcademicYearId(entity.getAcademicYearId());
        dto.setSemesterNo(entity.getSemesterNo());
        dto.setStartsOn(entity.getStartsOn());
        dto.setEndsOn(entity.getEndsOn());
        return dto;
    }
}
