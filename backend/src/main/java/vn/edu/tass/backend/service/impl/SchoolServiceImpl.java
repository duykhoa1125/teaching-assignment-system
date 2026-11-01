package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.School;
import vn.edu.tass.backend.payload.dto.SchoolDto;
import vn.edu.tass.backend.payload.request.SchoolRequest;
import vn.edu.tass.backend.repository.SchoolRepository;
import vn.edu.tass.backend.service.SchoolService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class SchoolServiceImpl implements SchoolService {
    private final SchoolRepository repository;

    public SchoolServiceImpl(SchoolRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SchoolDto> retrieveAllSchool(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(this::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SchoolDto retrieveById(long id) {
        return toDto(find(id));
    }

    @Override
    @Transactional
    public SchoolDto createSchool(SchoolRequest request) {
        School entity = new School();
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public SchoolDto updateSchool(long id, SchoolRequest request) {
        School entity = find(id);
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteSchool(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private SchoolDto toDto(School entity) {
        SchoolDto dto = new SchoolDto();
        dto.setId(entity.getId());
        dto.setSchoolCode(entity.getSchoolCode());
        dto.setName(entity.getName());
        dto.setStatus(entity.getStatus());
        return dto;
    }

    private void applyRequest(SchoolRequest request, School entity) {
        entity.setSchoolCode(request.getSchoolCode());
        entity.setName(request.getName());
        entity.setStatus(request.getStatus());
    }

    private School find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("school id=" + id + " does not exist"));
    }
}