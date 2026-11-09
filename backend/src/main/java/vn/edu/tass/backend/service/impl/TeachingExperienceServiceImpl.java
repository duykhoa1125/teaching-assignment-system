package vn.edu.tass.backend.service.impl;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.TeachingExperience;
import vn.edu.tass.backend.exception.BadRequestException;
import vn.edu.tass.backend.mapper.TeachingExperienceMapper;
import vn.edu.tass.backend.payload.dto.TeachingExperienceDto;
import vn.edu.tass.backend.payload.request.TeachingExperienceRequest;
import vn.edu.tass.backend.repository.TeachingExperienceRepository;
import vn.edu.tass.backend.service.TeachingExperienceService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class TeachingExperienceServiceImpl implements TeachingExperienceService {
    private final TeachingExperienceRepository repository;
    private final TeachingExperienceMapper mapper;

    public TeachingExperienceServiceImpl(TeachingExperienceRepository repository, TeachingExperienceMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeachingExperienceDto> retrieveAllTeachingExperience(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeachingExperienceDto retrieveById(long id) {
        return mapper.toDto(find(id));
    }

    @Override
    @Transactional
    public TeachingExperienceDto createTeachingExperience(TeachingExperienceRequest request) {
        validate(request);
        TeachingExperience entity = mapper.toEntity(request);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public TeachingExperienceDto updateTeachingExperience(long id, TeachingExperienceRequest request) {
        validate(request);
        TeachingExperience entity = find(id);
        mapper.applyRequest(request, entity);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteTeachingExperience(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private TeachingExperience find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("teaching_experience id=" + id + " does not exist"));
    }

    private static void validate(TeachingExperienceRequest request) {
        BigDecimal years = request.getYearsOfExperience();
        String status = request.getExperienceStatus();
        boolean valid = switch (status == null ? "" : status) {
            case "UNKNOWN" -> years == null;
            case "NO_EXPERIENCE" -> years != null && years.signum() == 0;
            case "HAS_EXPERIENCE" -> years != null && years.signum() > 0;
            default -> false;
        };
        if (!valid || years != null && years.compareTo(new BigDecimal("1000")) >= 0) {
            throw new BadRequestException("experience_status and years_of_experience are inconsistent");
        }
        if (!"UNKNOWN".equals(status) && (request.getVerifiedBy() == null
                || request.getVerifiedAt() == null || request.getEvidenceRef() == null
                || request.getEvidenceRef().isBlank())) {
            throw new BadRequestException("known experience requires verified_by, verified_at and evidence_ref");
        }
    }
}
