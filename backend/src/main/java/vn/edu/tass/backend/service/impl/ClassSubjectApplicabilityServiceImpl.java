package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.ClassSubjectApplicability;
import vn.edu.tass.backend.exception.BadRequestException;
import vn.edu.tass.backend.mapper.ClassSubjectApplicabilityMapper;
import vn.edu.tass.backend.payload.dto.ClassSubjectApplicabilityDto;
import vn.edu.tass.backend.payload.request.ClassSubjectApplicabilityRequest;
import vn.edu.tass.backend.repository.ClassSubjectApplicabilityRepository;
import vn.edu.tass.backend.service.ClassSubjectApplicabilityService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.InputSpecifications;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class ClassSubjectApplicabilityServiceImpl implements ClassSubjectApplicabilityService {
    private final ClassSubjectApplicabilityRepository repository;
    private final ClassSubjectApplicabilityMapper mapper;

    public ClassSubjectApplicabilityServiceImpl(ClassSubjectApplicabilityRepository repository, ClassSubjectApplicabilityMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ClassSubjectApplicabilityDto> retrieveAllClassSubjectApplicability(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ClassSubjectApplicabilityDto> searchClassSubjectApplicability(int limit, int offset, Long scopeId, Long classId, String status) {
        CrudParameters.requirePage(limit, offset);
        InputSpecifications.requirePositive(scopeId, "scope_id");
        InputSpecifications.requirePositive(classId, "class_id");
        Specification<ClassSubjectApplicability> filters = Specification.allOf(
            InputSpecifications.equal("scopeId", scopeId),
            InputSpecifications.equal("classId", classId),
            InputSpecifications.equal("status", InputSpecifications.optionalText(status, "status")));
        return repository.findAll(filters, new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ClassSubjectApplicabilityDto retrieveById(long id) {
        return mapper.toDto(find(id));
    }

    @Override
    @Transactional
    public ClassSubjectApplicabilityDto createClassSubjectApplicability(ClassSubjectApplicabilityRequest request) {
        validate(request);
        ClassSubjectApplicability entity = mapper.toEntity(request);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public ClassSubjectApplicabilityDto updateClassSubjectApplicability(long id, ClassSubjectApplicabilityRequest request) {
        validate(request);
        ClassSubjectApplicability entity = find(id);
        mapper.applyRequest(request, entity);
        return mapper.toDto(repository.saveAndFlush(entity));
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

    private static void validate(ClassSubjectApplicabilityRequest request) {
        if (request.getStatus() == null
                || !List.of("APPLICABLE", "NOT_APPLICABLE", "UNDETERMINED").contains(request.getStatus())) {
            throw new BadRequestException("status is invalid");
        }
        if ((request.getConfirmedBy() == null) != (request.getConfirmedAt() == null)
                || (request.getComponentsConfirmedBy() == null) != (request.getComponentsConfirmedAt() == null)) {
            throw new BadRequestException("confirmation actor and timestamp must be supplied together");
        }
    }
}
