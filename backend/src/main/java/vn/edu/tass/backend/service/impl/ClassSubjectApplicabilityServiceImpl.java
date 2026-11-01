package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.ClassSubjectApplicability;
import vn.edu.tass.backend.payload.dto.ClassSubjectApplicabilityDto;
import vn.edu.tass.backend.payload.request.ClassSubjectApplicabilityRequest;
import vn.edu.tass.backend.repository.ClassSubjectApplicabilityRepository;
import vn.edu.tass.backend.service.ClassSubjectApplicabilityService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class ClassSubjectApplicabilityServiceImpl implements ClassSubjectApplicabilityService {
    private final ClassSubjectApplicabilityRepository repository;

    public ClassSubjectApplicabilityServiceImpl(ClassSubjectApplicabilityRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ClassSubjectApplicabilityDto> retrieveAllClassSubjectApplicability(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(this::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ClassSubjectApplicabilityDto retrieveById(long id) {
        return toDto(find(id));
    }

    @Override
    @Transactional
    public ClassSubjectApplicabilityDto createClassSubjectApplicability(ClassSubjectApplicabilityRequest request) {
        ClassSubjectApplicability entity = new ClassSubjectApplicability();
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public ClassSubjectApplicabilityDto updateClassSubjectApplicability(long id, ClassSubjectApplicabilityRequest request) {
        ClassSubjectApplicability entity = find(id);
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteClassSubjectApplicability(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private ClassSubjectApplicabilityDto toDto(ClassSubjectApplicability entity) {
        ClassSubjectApplicabilityDto dto = new ClassSubjectApplicabilityDto();
        dto.setId(entity.getId());
        dto.setScopeId(entity.getScopeId());
        dto.setClassId(entity.getClassId());
        dto.setStatus(entity.getStatus());
        dto.setReason(entity.getReason());
        dto.setUpdatedBy(entity.getUpdatedBy());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }

    private void applyRequest(ClassSubjectApplicabilityRequest request, ClassSubjectApplicability entity) {
        entity.setScopeId(request.getScopeId());
        entity.setClassId(request.getClassId());
        entity.setStatus(request.getStatus());
        entity.setReason(request.getReason());
        entity.setUpdatedBy(request.getUpdatedBy());
    }

    private ClassSubjectApplicability find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("class_subject_applicability id=" + id + " does not exist"));
    }
}