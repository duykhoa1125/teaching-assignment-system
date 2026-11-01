package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.Grade;
import vn.edu.tass.backend.payload.dto.GradeDto;
import vn.edu.tass.backend.payload.request.GradeRequest;
import vn.edu.tass.backend.repository.GradeRepository;
import vn.edu.tass.backend.service.GradeService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class GradeServiceImpl implements GradeService {
    private final GradeRepository repository;
    private final ModelMapper mapper;

    public GradeServiceImpl(GradeRepository repository, ModelMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<GradeDto> retrieveAllGrade(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(entity -> mapper.map(entity, GradeDto.class)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public GradeDto retrieveById(long id) {
        return mapper.map(find(id), GradeDto.class);
    }

    @Override
    @Transactional
    public GradeDto createGrade(GradeRequest request) {
        Grade entity = mapper.map(request, Grade.class);
        return mapper.map(repository.saveAndFlush(entity), GradeDto.class);
    }

    @Override
    @Transactional
    public GradeDto updateGrade(long id, GradeRequest request) {
        Grade entity = find(id);
        entity.setEducationLevelId(request.getEducationLevelId());
        entity.setGradeCode(request.getGradeCode());
        entity.setName(request.getName());
        return mapper.map(repository.saveAndFlush(entity), GradeDto.class);
    }

    @Override
    @Transactional
    public void deleteGrade(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private Grade find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("grade id=" + id + " does not exist"));
    }
}