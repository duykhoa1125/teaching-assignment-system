package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.SchoolClass;
import vn.edu.tass.backend.payload.dto.SchoolClassDto;
import vn.edu.tass.backend.payload.request.SchoolClassRequest;
import vn.edu.tass.backend.repository.SchoolClassRepository;
import vn.edu.tass.backend.service.SchoolClassService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class SchoolClassServiceImpl implements SchoolClassService {
    private final SchoolClassRepository repository;

    public SchoolClassServiceImpl(SchoolClassRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SchoolClassDto> retrieveAllSchoolClass(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(this::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SchoolClassDto retrieveById(long id) {
        return toDto(find(id));
    }

    @Override
    @Transactional
    public SchoolClassDto createSchoolClass(SchoolClassRequest request) {
        SchoolClass entity = new SchoolClass();
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public SchoolClassDto updateSchoolClass(long id, SchoolClassRequest request) {
        SchoolClass entity = find(id);
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteSchoolClass(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private SchoolClassDto toDto(SchoolClass entity) {
        SchoolClassDto dto = new SchoolClassDto();
        dto.setId(entity.getId());
        dto.setAcademicYearId(entity.getAcademicYearId());
        dto.setGradeId(entity.getGradeId());
        dto.setClassCode(entity.getClassCode());
        dto.setStatus(entity.getStatus());
        return dto;
    }

    private void applyRequest(SchoolClassRequest request, SchoolClass entity) {
        entity.setAcademicYearId(request.getAcademicYearId());
        entity.setGradeId(request.getGradeId());
        entity.setClassCode(request.getClassCode());
        entity.setStatus(request.getStatus());
    }

    private SchoolClass find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("school_class id=" + id + " does not exist"));
    }
}