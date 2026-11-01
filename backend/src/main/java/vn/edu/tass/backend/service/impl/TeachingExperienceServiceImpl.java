package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.TeachingExperience;
import vn.edu.tass.backend.payload.dto.TeachingExperienceDto;
import vn.edu.tass.backend.payload.request.TeachingExperienceRequest;
import vn.edu.tass.backend.repository.TeachingExperienceRepository;
import vn.edu.tass.backend.service.TeachingExperienceService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class TeachingExperienceServiceImpl implements TeachingExperienceService {
    private final TeachingExperienceRepository repository;

    public TeachingExperienceServiceImpl(TeachingExperienceRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeachingExperienceDto> retrieveAllTeachingExperience(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(this::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeachingExperienceDto retrieveById(long id) {
        return toDto(find(id));
    }

    @Override
    @Transactional
    public TeachingExperienceDto createTeachingExperience(TeachingExperienceRequest request) {
        TeachingExperience entity = new TeachingExperience();
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public TeachingExperienceDto updateTeachingExperience(long id, TeachingExperienceRequest request) {
        TeachingExperience entity = find(id);
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteTeachingExperience(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private TeachingExperienceDto toDto(TeachingExperience entity) {
        TeachingExperienceDto dto = new TeachingExperienceDto();
        dto.setId(entity.getId());
        dto.setTeacherId(entity.getTeacherId());
        dto.setSubjectId(entity.getSubjectId());
        dto.setGradeId(entity.getGradeId());
        dto.setExperienceLevel(entity.getExperienceLevel());
        dto.setExperiencePeriod(entity.getExperiencePeriod());
        dto.setRecordedBy(entity.getRecordedBy());
        dto.setRecordedAt(entity.getRecordedAt());
        return dto;
    }

    private void applyRequest(TeachingExperienceRequest request, TeachingExperience entity) {
        entity.setTeacherId(request.getTeacherId());
        entity.setSubjectId(request.getSubjectId());
        entity.setGradeId(request.getGradeId());
        entity.setExperienceLevel(request.getExperienceLevel());
        entity.setExperiencePeriod(request.getExperiencePeriod());
        entity.setRecordedBy(request.getRecordedBy());
    }

    private TeachingExperience find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("teaching_experience id=" + id + " does not exist"));
    }
}