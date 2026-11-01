package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.modelmapper.ModelMapper;
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
    private final ModelMapper mapper;

    public ClassSubjectApplicabilityServiceImpl(ClassSubjectApplicabilityRepository repository, ModelMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ClassSubjectApplicabilityDto> retrieveAllClassSubjectApplicability(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(entity -> mapper.map(entity, ClassSubjectApplicabilityDto.class)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ClassSubjectApplicabilityDto retrieveById(long id) {
        return mapper.map(find(id), ClassSubjectApplicabilityDto.class);
    }

    @Override
    @Transactional
    public ClassSubjectApplicabilityDto createClassSubjectApplicability(ClassSubjectApplicabilityRequest request) {
        ClassSubjectApplicability entity = mapper.map(request, ClassSubjectApplicability.class);
        return mapper.map(repository.saveAndFlush(entity), ClassSubjectApplicabilityDto.class);
    }

    @Override
    @Transactional
    public ClassSubjectApplicabilityDto updateClassSubjectApplicability(long id, ClassSubjectApplicabilityRequest request) {
        ClassSubjectApplicability entity = find(id);
        entity.setScopeId(request.getScopeId());
        entity.setClassId(request.getClassId());
        entity.setStatus(request.getStatus());
        entity.setReason(request.getReason());
        entity.setUpdatedBy(request.getUpdatedBy());
        return mapper.map(repository.saveAndFlush(entity), ClassSubjectApplicabilityDto.class);
    }

    @Override
    @Transactional
    public void deleteClassSubjectApplicability(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private ClassSubjectApplicability find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("class_subject_applicability id=" + id + " does not exist"));
    }
}