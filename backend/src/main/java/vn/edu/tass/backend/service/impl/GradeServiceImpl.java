package vn.edu.tass.backend.service.impl;

import java.util.List;
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

    public GradeServiceImpl(GradeRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<GradeDto> retrieveAllGrade(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(this::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public GradeDto retrieveById(long id) {
        return toDto(find(id));
    }

    @Override
    @Transactional
    public GradeDto createGrade(GradeRequest request) {
        Grade entity = new Grade();
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public GradeDto updateGrade(long id, GradeRequest request) {
        Grade entity = find(id);
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteGrade(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private GradeDto toDto(Grade entity) {
        GradeDto dto = new GradeDto();
        dto.setId(entity.getId());
        dto.setEducationLevelId(entity.getEducationLevelId());
        dto.setGradeCode(entity.getGradeCode());
        dto.setName(entity.getName());
        return dto;
    }

    private void applyRequest(GradeRequest request, Grade entity) {
        entity.setEducationLevelId(request.getEducationLevelId());
        entity.setGradeCode(request.getGradeCode());
        entity.setName(request.getName());
    }

    private Grade find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("grade id=" + id + " does not exist"));
    }
}