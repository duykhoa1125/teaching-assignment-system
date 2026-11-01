package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.AssignmentRound;
import vn.edu.tass.backend.payload.dto.AssignmentRoundDto;
import vn.edu.tass.backend.payload.request.AssignmentRoundRequest;
import vn.edu.tass.backend.repository.AssignmentRoundRepository;
import vn.edu.tass.backend.service.AssignmentRoundService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class AssignmentRoundServiceImpl implements AssignmentRoundService {
    private final AssignmentRoundRepository repository;

    public AssignmentRoundServiceImpl(AssignmentRoundRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AssignmentRoundDto> retrieveAllAssignmentRound(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(this::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AssignmentRoundDto retrieveById(long id) {
        return toDto(find(id));
    }

    @Override
    @Transactional
    public AssignmentRoundDto createAssignmentRound(AssignmentRoundRequest request) {
        AssignmentRound entity = new AssignmentRound();
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public AssignmentRoundDto updateAssignmentRound(long id, AssignmentRoundRequest request) {
        AssignmentRound entity = find(id);
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteAssignmentRound(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private AssignmentRoundDto toDto(AssignmentRound entity) {
        AssignmentRoundDto dto = new AssignmentRoundDto();
        dto.setId(entity.getId());
        dto.setSemesterId(entity.getSemesterId());
        dto.setRoundCode(entity.getRoundCode());
        dto.setStatus(entity.getStatus());
        dto.setScopeConfirmedBy(entity.getScopeConfirmedBy());
        dto.setScopeConfirmedAt(entity.getScopeConfirmedAt());
        dto.setOpensAt(entity.getOpensAt());
        dto.setClosesAt(entity.getClosesAt());
        return dto;
    }

    private void applyRequest(AssignmentRoundRequest request, AssignmentRound entity) {
        entity.setSemesterId(request.getSemesterId());
        entity.setRoundCode(request.getRoundCode());
        entity.setStatus(request.getStatus());
        entity.setScopeConfirmedBy(request.getScopeConfirmedBy());
        entity.setScopeConfirmedAt(request.getScopeConfirmedAt());
        entity.setOpensAt(request.getOpensAt());
        entity.setClosesAt(request.getClosesAt());
    }

    private AssignmentRound find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("assignment_round id=" + id + " does not exist"));
    }
}