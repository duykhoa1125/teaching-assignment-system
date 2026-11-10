package vn.edu.tass.backend.service.impl;

import java.math.BigDecimal;
import java.util.List;
import java.time.LocalDate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.TeachingDemand;
import vn.edu.tass.backend.exception.BadRequestException;
import vn.edu.tass.backend.mapper.TeachingDemandMapper;
import vn.edu.tass.backend.payload.dto.TeachingDemandDto;
import vn.edu.tass.backend.payload.request.TeachingDemandRequest;
import vn.edu.tass.backend.repository.TeachingDemandRepository;
import vn.edu.tass.backend.service.TeachingDemandService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.InputSpecifications;
import vn.edu.tass.backend.utils.InputRecordRules;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class TeachingDemandServiceImpl implements TeachingDemandService {
    private final TeachingDemandRepository repository;
    private final TeachingDemandMapper mapper;

    public TeachingDemandServiceImpl(TeachingDemandRepository repository, TeachingDemandMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeachingDemandDto> retrieveAllTeachingDemand(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeachingDemandDto> searchTeachingDemand(int limit, int offset, Long semesterId, Long classId, Long subjectId, String demandType, String status, LocalDate asOf) {
        CrudParameters.requirePage(limit, offset);
        InputSpecifications.requirePositive(semesterId, "semester_id");
        InputSpecifications.requirePositive(classId, "class_id");
        InputSpecifications.requirePositive(subjectId, "subject_id");
        String statusFilter = InputSpecifications.optionalText(status, "status");
        if (statusFilter != null) InputRecordRules.demandStatus(statusFilter);
        Specification<vn.edu.tass.backend.entity.TeachingDemand> filters = Specification.allOf(
            InputSpecifications.equal("semesterId", semesterId),
            InputSpecifications.equal("classId", classId),
            InputSpecifications.equal("subjectId", subjectId),
            InputSpecifications.equal("demandType", InputSpecifications.optionalText(demandType, "demand_type")),
            InputSpecifications.equal("status", statusFilter),
            InputSpecifications.activeOn("validFrom", "validTo", asOf));
        return repository.findAll(filters, new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeachingDemandDto retrieveById(long id) {
        return mapper.toDto(find(id));
    }

    @Override
    @Transactional
    public TeachingDemandDto createTeachingDemand(TeachingDemandRequest request) {
        validate(request);
        TeachingDemand entity = mapper.toEntity(request);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public TeachingDemandDto updateTeachingDemand(long id, TeachingDemandRequest request) {
        validate(request);
        TeachingDemand entity = find(id);
        mapper.applyRequest(request, entity);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteTeachingDemand(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private TeachingDemand find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("teaching_demand id=" + id + " does not exist"));
    }

    private static void validate(TeachingDemandRequest request) {
        InputRecordRules.demandStatus(request.getStatus());
        if (request.getValidFrom() == null || request.getValidTo() == null
                || request.getValidTo().isBefore(request.getValidFrom())) {
            throw new BadRequestException("valid_to must be on or after valid_from");
        }
        BigDecimal periods = request.getPeriodsPerWeek();
        if (periods == null || periods.signum() <= 0 || periods.compareTo(new BigDecimal("999.99")) > 0
                || periods.stripTrailingZeros().scale() > 2) {
            throw new BadRequestException("periods_per_week must be positive, at most 999.99, with two decimal places");
        }
        if (request.getDemandType() == null
                || !List.of("STANDARD", "SPECIALIZED_TOPIC", "ENRICHMENT").contains(request.getDemandType())) {
            throw new BadRequestException("demand_type is invalid");
        }
        if (!"PERIOD_PER_WEEK".equals(request.getUnit())) {
            throw new BadRequestException("unit must be PERIOD_PER_WEEK");
        }
    }
}
