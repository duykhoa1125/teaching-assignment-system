package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.modelmapper.ModelMapper;
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
    private final ModelMapper mapper;

    public EducationLevelServiceImpl(EducationLevelRepository repository, ModelMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<EducationLevelDto> retrieveAllEducationLevel(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(entity -> mapper.map(entity, EducationLevelDto.class)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public EducationLevelDto retrieveById(long id) {
        return mapper.map(find(id), EducationLevelDto.class);
    }

    @Override
    @Transactional
    public EducationLevelDto createEducationLevel(EducationLevelRequest request) {
        EducationLevel entity = mapper.map(request, EducationLevel.class);
        return mapper.map(repository.saveAndFlush(entity), EducationLevelDto.class);
    }

    @Override
    @Transactional
    public EducationLevelDto updateEducationLevel(long id, EducationLevelRequest request) {
        EducationLevel entity = find(id);
        entity.setLevelCode(request.getLevelCode());
        entity.setName(request.getName());
        return mapper.map(repository.saveAndFlush(entity), EducationLevelDto.class);
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