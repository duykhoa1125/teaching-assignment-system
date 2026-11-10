package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.AssignmentRound;
import vn.edu.tass.backend.mapper.AssignmentRoundMapper;
import vn.edu.tass.backend.payload.dto.AssignmentRoundDto;
import vn.edu.tass.backend.payload.request.AssignmentRoundRequest;
import vn.edu.tass.backend.repository.AssignmentRoundRepository;
import vn.edu.tass.backend.service.AssignmentRoundService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.InputSpecifications;
import vn.edu.tass.backend.utils.InputRecordRules;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class AssignmentRoundServiceImpl implements AssignmentRoundService {
    private final AssignmentRoundRepository repository;
    private final AssignmentRoundMapper mapper;
    private final EntityManager entityManager;

    public AssignmentRoundServiceImpl(AssignmentRoundRepository repository, AssignmentRoundMapper mapper,
            EntityManager entityManager) {
        this.repository = repository;
        this.mapper = mapper;
        this.entityManager = entityManager;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AssignmentRoundDto> retrieveAllAssignmentRound(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AssignmentRoundDto> searchAssignmentRound(int limit, int offset, Long semesterId, String status) {
        CrudParameters.requirePage(limit, offset);
        InputSpecifications.requirePositive(semesterId, "semester_id");
        Specification<AssignmentRound> filters = Specification.allOf(
            InputSpecifications.equal("semesterId", semesterId),
            InputSpecifications.equal("status", InputSpecifications.optionalText(status, "status")));
        return repository.findAll(filters, new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AssignmentRoundDto retrieveById(long id) {
        return mapper.toDto(find(id));
    }

    @Override
    @Transactional
    public AssignmentRoundDto createAssignmentRound(AssignmentRoundRequest request) {
        validate(request);
        AssignmentRound entity = mapper.toEntity(request);
        AssignmentRound saved = repository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return mapper.toDto(saved);
    }

    @Override
    @Transactional
    public AssignmentRoundDto updateAssignmentRound(long id, AssignmentRoundRequest request) {
        validate(request);
        AssignmentRound entity = find(id);
        mapper.applyRequest(request, entity);
        AssignmentRound saved = repository.saveAndFlush(entity);
        entityManager.refresh(saved);
        return mapper.toDto(saved);
    }

    @Override
    @Transactional
    public void deleteAssignmentRound(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private AssignmentRound find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("assignment_round id=" + id + " does not exist"));
    }

    private static void validate(AssignmentRoundRequest request) {
        InputRecordRules.confirmation(request.getScopeConfirmedBy(), request.getScopeConfirmedAt(), "scope confirmation");
        InputRecordRules.orderedTimes(request.getOpensAt(), request.getClosesAt(), "opens_at", "closes_at");
    }
}
