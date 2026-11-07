package vn.edu.tass.backend.mapper;

import org.springframework.stereotype.Component;
import vn.edu.tass.backend.entity.Subject;
import vn.edu.tass.backend.payload.dto.SubjectDto;
import vn.edu.tass.backend.payload.request.SubjectRequest;

@Component
public class SubjectMapper {
    public Subject toEntity(SubjectRequest request) {
        Subject entity = new Subject();
        applyRequest(request, entity);
        return entity;
    }

    public void applyRequest(SubjectRequest request, Subject entity) {
        entity.setSubjectCode(request.getSubjectCode());
        entity.setName(request.getName());
        entity.setValidFrom(request.getValidFrom());
        entity.setValidTo(request.getValidTo());
    }

    public SubjectDto toDto(Subject entity) {
        SubjectDto dto = new SubjectDto();
        dto.setId(entity.getId());
        dto.setSubjectCode(entity.getSubjectCode());
        dto.setName(entity.getName());
        dto.setValidFrom(entity.getValidFrom());
        dto.setValidTo(entity.getValidTo());
        return dto;
    }
}
