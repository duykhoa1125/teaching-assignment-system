package vn.edu.tass.backend.service.impl;

import java.util.List;
import java.time.LocalDate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.RequiredDemandComponent;
import vn.edu.tass.backend.exception.BadRequestException;
import vn.edu.tass.backend.exception.NotFoundException;
import vn.edu.tass.backend.mapper.RequiredDemandComponentMapper;
import vn.edu.tass.backend.payload.dto.RequiredDemandComponentDto;
import vn.edu.tass.backend.payload.request.RequiredDemandComponentRequest;
import vn.edu.tass.backend.repository.RequiredDemandComponentRepository;
import vn.edu.tass.backend.service.RequiredDemandComponentService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.InputSpecifications;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class RequiredDemandComponentServiceImpl implements RequiredDemandComponentService {
    private final RequiredDemandComponentRepository repository;
    private final RequiredDemandComponentMapper mapper;

    public RequiredDemandComponentServiceImpl(RequiredDemandComponentRepository repository,
            RequiredDemandComponentMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<RequiredDemandComponentDto> retrieveAllRequiredDemandComponent(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream().map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RequiredDemandComponentDto> searchRequiredDemandComponent(int limit, int offset, Long applicabilityId, String demandType, LocalDate asOf) {
        CrudParameters.requirePage(limit, offset);
        InputSpecifications.requirePositive(applicabilityId, "applicability_id");
        Specification<RequiredDemandComponent> filters = Specification.allOf(
            InputSpecifications.equal("applicabilityId", applicabilityId),
            InputSpecifications.equal("demandType", InputSpecifications.optionalText(demandType, "demand_type")),
            InputSpecifications.activeOn("validFrom", "validTo", asOf));
        return repository.findAll(filters, new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public RequiredDemandComponentDto retrieveById(long id) {
        return mapper.toDto(find(id));
    }

    @Override
    @Transactional
    public RequiredDemandComponentDto createRequiredDemandComponent(RequiredDemandComponentRequest request) {
        validate(request);
        return mapper.toDto(repository.saveAndFlush(mapper.toEntity(request)));
    }

    @Override
    @Transactional
    public RequiredDemandComponentDto updateRequiredDemandComponent(long id, RequiredDemandComponentRequest request) {
        validate(request);
        RequiredDemandComponent entity = find(id);
        mapper.applyRequest(request, entity);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteRequiredDemandComponent(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private RequiredDemandComponent find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new NotFoundException("required_demand_component id=" + id + " does not exist"));
    }

    private static void validate(RequiredDemandComponentRequest request) {
        if (request.getDemandType() == null
                || !List.of("STANDARD", "SPECIALIZED_TOPIC", "ENRICHMENT").contains(request.getDemandType())) {
            throw new BadRequestException("demand_type is invalid");
        }
        if (request.getValidFrom() == null || request.getValidTo() == null
                || request.getValidTo().isBefore(request.getValidFrom())) {
            throw new BadRequestException("valid_to must be on or after valid_from");
        }
        if ((request.getConfirmedBy() == null) != (request.getConfirmedAt() == null)) {
            throw new BadRequestException("confirmation actor and timestamp must be supplied together");
        }
    }
}
