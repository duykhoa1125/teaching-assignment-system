package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.TeachingQualification;
import vn.edu.tass.backend.payload.dto.TeachingQualificationDto;
import vn.edu.tass.backend.payload.request.TeachingQualificationRequest;
import vn.edu.tass.backend.repository.TeachingQualificationRepository;
import vn.edu.tass.backend.service.TeachingQualificationService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class TeachingQualificationServiceImpl implements TeachingQualificationService {
    private final TeachingQualificationRepository repository;

    public TeachingQualificationServiceImpl(TeachingQualificationRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeachingQualificationDto> retrieveAllTeachingQualification(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(this::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeachingQualificationDto retrieveById(long id) {
        return toDto(find(id));
    }

    @Override
    @Transactional
    public TeachingQualificationDto createTeachingQualification(TeachingQualificationRequest request) {
        TeachingQualification entity = new TeachingQualification();
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public TeachingQualificationDto updateTeachingQualification(long id, TeachingQualificationRequest request) {
        TeachingQualification entity = find(id);
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteTeachingQualification(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private TeachingQualificationDto toDto(TeachingQualification entity) {
        TeachingQualificationDto dto = new TeachingQualificationDto();
        dto.setId(entity.getId());
        dto.setTeacherId(entity.getTeacherId());
        dto.setSubjectId(entity.getSubjectId());
        dto.setEducationLevelId(entity.getEducationLevelId());
        dto.setVerificationStatus(entity.getVerificationStatus());
        dto.setVerifiedBy(entity.getVerifiedBy());
        dto.setVerifiedAt(entity.getVerifiedAt());
        dto.setEvidenceRef(entity.getEvidenceRef());
        dto.setValidFrom(entity.getValidFrom());
        dto.setValidTo(entity.getValidTo());
        return dto;
    }

    private void applyRequest(TeachingQualificationRequest request, TeachingQualification entity) {
        entity.setTeacherId(request.getTeacherId());
        entity.setSubjectId(request.getSubjectId());
        entity.setEducationLevelId(request.getEducationLevelId());
        entity.setVerificationStatus(request.getVerificationStatus());
        entity.setVerifiedBy(request.getVerifiedBy());
        entity.setVerifiedAt(request.getVerifiedAt());
        entity.setEvidenceRef(request.getEvidenceRef());
        entity.setValidFrom(request.getValidFrom());
        entity.setValidTo(request.getValidTo());
    }

    private TeachingQualification find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("teaching_qualification id=" + id + " does not exist"));
    }
}