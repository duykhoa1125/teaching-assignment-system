package vn.edu.tass.backend.mapper;

import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.School;
import vn.edu.tass.backend.payload.dto.SchoolDto;
import vn.edu.tass.backend.payload.request.SchoolRequest;

@Component
public class SchoolMapper {
    public School toEntity(SchoolRequest request) {
        School entity = new School();
        applyRequest(request, entity);
        return entity;
    }

    public void applyRequest(SchoolRequest request, School entity) {
        entity.setSchoolCode(request.getSchoolCode());
        entity.setName(request.getName());
        entity.setStatus(request.getStatus());
    }

    public SchoolDto toDto(School entity) {
        SchoolDto dto = new SchoolDto();
        dto.setId(entity.getId());
        dto.setSchoolCode(entity.getSchoolCode());
        dto.setName(entity.getName());
        dto.setStatus(entity.getStatus());
        return dto;
    }
}
