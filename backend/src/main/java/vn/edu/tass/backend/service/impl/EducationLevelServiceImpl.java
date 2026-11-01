package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.EducationLevel;
import vn.edu.tass.backend.payload.dto.EducationLevelDto;
import vn.edu.tass.backend.payload.request.EducationLevelRequest;
import vn.edu.tass.backend.repository.EducationLevelRepository;
import vn.edu.tass.backend.service.EducationLevelService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class EducationLevelServiceImpl implements EducationLevelService {
    private final EducationLevelRepository repository;

    public EducationLevelServiceImpl(EducationLevelRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<EducationLevelDto> retrieveAllEducationLevel(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(this::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public EducationLevelDto retrieveById(long id) {
        return toDto(find(id));
    }

    @Override
    @Transactional
    public EducationLevelDto createEducationLevel(EducationLevelRequest request) {
        EducationLevel entity = new EducationLevel();
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public EducationLevelDto updateEducationLevel(long id, EducationLevelRequest request) {
        EducationLevel entity = find(id);
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteEducationLevel(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private EducationLevelDto toDto(EducationLevel entity) {
        EducationLevelDto dto = new EducationLevelDto();
        dto.setId(entity.getId());
        dto.setLevelCode(entity.getLevelCode());
        dto.setName(entity.getName());
        return dto;
    }

    private void applyRequest(EducationLevelRequest request, EducationLevel entity) {
        entity.setLevelCode(request.getLevelCode());
        entity.setName(request.getName());
    }

    private EducationLevel find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("education_level id=" + id + " does not exist"));
    }
}