package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.Grade;
import vn.edu.tass.backend.mapper.GradeMapper;
import vn.edu.tass.backend.payload.dto.GradeDto;
import vn.edu.tass.backend.payload.request.GradeRequest;
import vn.edu.tass.backend.repository.GradeRepository;
import vn.edu.tass.backend.service.GradeService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.InputSpecifications;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class GradeServiceImpl implements GradeService {
    private final GradeRepository repository;
    private final GradeMapper mapper;

    public GradeServiceImpl(GradeRepository repository, GradeMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<GradeDto> retrieveAllGrade(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<GradeDto> searchGrade(int limit, int offset, Long educationLevelId) {
        CrudParameters.requirePage(limit, offset);
        InputSpecifications.requirePositive(educationLevelId, "education_level_id");
        Specification<Grade> filters = Specification.allOf(
            InputSpecifications.equal("educationLevelId", educationLevelId));
        return repository.findAll(filters, new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public GradeDto retrieveById(long id) {
        return mapper.toDto(find(id));
    }

    @Override
    @Transactional
    public GradeDto createGrade(GradeRequest request) {
        Grade entity = mapper.toEntity(request);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public GradeDto updateGrade(long id, GradeRequest request) {
        Grade entity = find(id);
        mapper.applyRequest(request, entity);
        return mapper.toDto(repository.saveAndFlush(entity));
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
