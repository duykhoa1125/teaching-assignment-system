package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.RoundSubjectScope;
import vn.edu.tass.backend.mapper.RoundSubjectScopeMapper;
import vn.edu.tass.backend.payload.dto.RoundSubjectScopeDto;
import vn.edu.tass.backend.payload.request.RoundSubjectScopeRequest;
import vn.edu.tass.backend.repository.RoundSubjectScopeRepository;
import vn.edu.tass.backend.service.RoundSubjectScopeService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.InputSpecifications;
import vn.edu.tass.backend.utils.InputRecordRules;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class RoundSubjectScopeServiceImpl implements RoundSubjectScopeService {
    private final RoundSubjectScopeRepository repository;
    private final RoundSubjectScopeMapper mapper;

    public RoundSubjectScopeServiceImpl(RoundSubjectScopeRepository repository, RoundSubjectScopeMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoundSubjectScopeDto> retrieveAllRoundSubjectScope(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoundSubjectScopeDto> searchRoundSubjectScope(int limit, int offset, Long roundId, Long gradeId, Long subjectId) {
        CrudParameters.requirePage(limit, offset);
        InputSpecifications.requirePositive(roundId, "round_id");
        InputSpecifications.requirePositive(gradeId, "grade_id");
        InputSpecifications.requirePositive(subjectId, "subject_id");
        Specification<RoundSubjectScope> filters = Specification.allOf(
            InputSpecifications.equal("roundId", roundId),
            InputSpecifications.equal("gradeId", gradeId),
            InputSpecifications.equal("subjectId", subjectId));
        return repository.findAll(filters, new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public RoundSubjectScopeDto retrieveById(long id) {
        return mapper.toDto(find(id));
    }

    @Override
    @Transactional
    public RoundSubjectScopeDto createRoundSubjectScope(RoundSubjectScopeRequest request) {
        InputRecordRules.confirmation(request.getConfirmedBy(), request.getConfirmedAt(), "scope confirmation");
        RoundSubjectScope entity = mapper.toEntity(request);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public RoundSubjectScopeDto updateRoundSubjectScope(long id, RoundSubjectScopeRequest request) {
        InputRecordRules.confirmation(request.getConfirmedBy(), request.getConfirmedAt(), "scope confirmation");
        RoundSubjectScope entity = find(id);
        mapper.applyRequest(request, entity);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteRoundSubjectScope(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private RoundSubjectScope find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("round_subject_scope id=" + id + " does not exist"));
    }
}
