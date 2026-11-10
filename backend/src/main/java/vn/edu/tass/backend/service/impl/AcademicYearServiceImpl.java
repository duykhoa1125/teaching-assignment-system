package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.AcademicYear;
import vn.edu.tass.backend.mapper.AcademicYearMapper;
import vn.edu.tass.backend.payload.dto.AcademicYearDto;
import vn.edu.tass.backend.payload.request.AcademicYearRequest;
import vn.edu.tass.backend.repository.AcademicYearRepository;
import vn.edu.tass.backend.service.AcademicYearService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.InputSpecifications;
import vn.edu.tass.backend.utils.InputRecordRules;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class AcademicYearServiceImpl implements AcademicYearService {
    private final AcademicYearRepository repository;
    private final AcademicYearMapper mapper;

    public AcademicYearServiceImpl(AcademicYearRepository repository, AcademicYearMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AcademicYearDto> retrieveAllAcademicYear(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AcademicYearDto> searchAcademicYear(int limit, int offset, Long schoolId) {
        CrudParameters.requirePage(limit, offset);
        InputSpecifications.requirePositive(schoolId, "school_id");
        Specification<AcademicYear> filters = Specification.allOf(
            InputSpecifications.equal("schoolId", schoolId));
        return repository.findAll(filters, new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AcademicYearDto retrieveById(long id) {
        return mapper.toDto(find(id));
    }

    @Override
    @Transactional
    public AcademicYearDto createAcademicYear(AcademicYearRequest request) {
        InputRecordRules.dates(request.getStartsOn(), request.getEndsOn(), "starts_on", "ends_on");
        AcademicYear entity = mapper.toEntity(request);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public AcademicYearDto updateAcademicYear(long id, AcademicYearRequest request) {
        InputRecordRules.dates(request.getStartsOn(), request.getEndsOn(), "starts_on", "ends_on");
        AcademicYear entity = find(id);
        mapper.applyRequest(request, entity);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteAcademicYear(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private AcademicYear find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("academic_year id=" + id + " does not exist"));
    }
}
