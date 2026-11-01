package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.EducationLevel;
import vn.edu.tass.backend.mapper.EducationLevelMapper;
import vn.edu.tass.backend.payload.dto.EducationLevelDto;
import vn.edu.tass.backend.payload.request.EducationLevelRequest;
import vn.edu.tass.backend.repository.EducationLevelRepository;
import vn.edu.tass.backend.service.EducationLevelService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class EducationLevelServiceImpl implements EducationLevelService {
    private final EducationLevelRepository repository;
    private final EducationLevelMapper mapper;

    public EducationLevelServiceImpl(EducationLevelRepository repository, EducationLevelMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<EducationLevelDto> retrieveAllEducationLevel(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public EducationLevelDto retrieveById(long id) {
        return mapper.toDto(find(id));
    }

    @Override
    @Transactional
    public EducationLevelDto createEducationLevel(EducationLevelRequest request) {
        EducationLevel entity = mapper.toEntity(request);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public EducationLevelDto updateEducationLevel(long id, EducationLevelRequest request) {
        EducationLevel entity = find(id);
        mapper.applyRequest(request, entity);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteEducationLevel(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private EducationLevel find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("education_level id=" + id + " does not exist"));
    }
}