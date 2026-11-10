package vn.edu.tass.backend.service.impl;

import java.util.List;
import java.time.LocalDate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.TeachingQualification;
import vn.edu.tass.backend.mapper.TeachingQualificationMapper;
import vn.edu.tass.backend.payload.dto.TeachingQualificationDto;
import vn.edu.tass.backend.payload.request.TeachingQualificationRequest;
import vn.edu.tass.backend.repository.TeachingQualificationRepository;
import vn.edu.tass.backend.service.TeachingQualificationService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.InputSpecifications;
import vn.edu.tass.backend.utils.InputRecordRules;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class TeachingQualificationServiceImpl implements TeachingQualificationService {
    private final TeachingQualificationRepository repository;
    private final TeachingQualificationMapper mapper;

    public TeachingQualificationServiceImpl(TeachingQualificationRepository repository, TeachingQualificationMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeachingQualificationDto> retrieveAllTeachingQualification(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeachingQualificationDto> searchTeachingQualification(int limit, int offset, Long teacherId, Long subjectId, Long educationLevelId, String verificationStatus, LocalDate asOf) {
        CrudParameters.requirePage(limit, offset);
        InputSpecifications.requirePositive(teacherId, "teacher_id");
        InputSpecifications.requirePositive(subjectId, "subject_id");
        InputSpecifications.requirePositive(educationLevelId, "education_level_id");
        String statusFilter = InputSpecifications.optionalText(verificationStatus, "verification_status");
        if (statusFilter != null) InputRecordRules.qualificationStatus(statusFilter);
        Specification<TeachingQualification> filters = Specification.allOf(
            InputSpecifications.equal("teacherId", teacherId),
            InputSpecifications.equal("subjectId", subjectId),
            InputSpecifications.equal("educationLevelId", educationLevelId),
            InputSpecifications.equal("verificationStatus", statusFilter),
            InputSpecifications.activeOn("validFrom", "validTo", asOf));
        return repository.findAll(filters, new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeachingQualificationDto retrieveById(long id) {
        return mapper.toDto(find(id));
    }

    @Override
    @Transactional
    public TeachingQualificationDto createTeachingQualification(TeachingQualificationRequest request) {
        validate(request);
        TeachingQualification entity = mapper.toEntity(request);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public TeachingQualificationDto updateTeachingQualification(long id, TeachingQualificationRequest request) {
        validate(request);
        TeachingQualification entity = find(id);
        mapper.applyRequest(request, entity);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteTeachingQualification(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private TeachingQualification find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("teaching_qualification id=" + id + " does not exist"));
    }

    private static void validate(TeachingQualificationRequest request) {
        InputRecordRules.qualificationStatus(request.getVerificationStatus());
        InputRecordRules.optionalEnd(request.getValidFrom(), request.getValidTo(), "valid_from", "valid_to");
        InputRecordRules.confirmation(request.getVerifiedBy(), request.getVerifiedAt(), "verification");
    }
}
