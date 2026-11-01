package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.modelmapper.ModelMapper;
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
    private final ModelMapper mapper;

    public TeachingQualificationServiceImpl(TeachingQualificationRepository repository, ModelMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeachingQualificationDto> retrieveAllTeachingQualification(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(entity -> mapper.map(entity, TeachingQualificationDto.class)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeachingQualificationDto retrieveById(long id) {
        return mapper.map(find(id), TeachingQualificationDto.class);
    }

    @Override
    @Transactional
    public TeachingQualificationDto createTeachingQualification(TeachingQualificationRequest request) {
        TeachingQualification entity = mapper.map(request, TeachingQualification.class);
        return mapper.map(repository.saveAndFlush(entity), TeachingQualificationDto.class);
    }

    @Override
    @Transactional
    public TeachingQualificationDto updateTeachingQualification(long id, TeachingQualificationRequest request) {
        TeachingQualification entity = find(id);
        entity.setTeacherId(request.getTeacherId());
        entity.setSubjectId(request.getSubjectId());
        entity.setEducationLevelId(request.getEducationLevelId());
        entity.setVerificationStatus(request.getVerificationStatus());
        entity.setVerifiedBy(request.getVerifiedBy());
        entity.setVerifiedAt(request.getVerifiedAt());
        entity.setEvidenceRef(request.getEvidenceRef());
        entity.setValidFrom(request.getValidFrom());
        entity.setValidTo(request.getValidTo());
        return mapper.map(repository.saveAndFlush(entity), TeachingQualificationDto.class);
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
}