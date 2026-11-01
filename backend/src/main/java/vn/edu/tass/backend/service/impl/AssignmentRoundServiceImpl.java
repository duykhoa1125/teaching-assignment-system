package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.modelmapper.ModelMapper;
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
    private final ModelMapper mapper;

    public AssignmentRoundServiceImpl(AssignmentRoundRepository repository, ModelMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AssignmentRoundDto> retrieveAllAssignmentRound(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(entity -> mapper.map(entity, AssignmentRoundDto.class)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AssignmentRoundDto retrieveById(long id) {
        return mapper.map(find(id), AssignmentRoundDto.class);
    }

    @Override
    @Transactional
    public AssignmentRoundDto createAssignmentRound(AssignmentRoundRequest request) {
        AssignmentRound entity = mapper.map(request, AssignmentRound.class);
        return mapper.map(repository.saveAndFlush(entity), AssignmentRoundDto.class);
    }

    @Override
    @Transactional
    public AssignmentRoundDto updateAssignmentRound(long id, AssignmentRoundRequest request) {
        AssignmentRound entity = find(id);
        entity.setSemesterId(request.getSemesterId());
        entity.setRoundCode(request.getRoundCode());
        entity.setStatus(request.getStatus());
        entity.setScopeConfirmedBy(request.getScopeConfirmedBy());
        entity.setScopeConfirmedAt(request.getScopeConfirmedAt());
        entity.setOpensAt(request.getOpensAt());
        entity.setClosesAt(request.getClosesAt());
        return mapper.map(repository.saveAndFlush(entity), AssignmentRoundDto.class);
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
}