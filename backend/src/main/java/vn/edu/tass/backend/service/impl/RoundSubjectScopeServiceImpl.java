package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.RoundSubjectScope;
import vn.edu.tass.backend.payload.dto.RoundSubjectScopeDto;
import vn.edu.tass.backend.payload.request.RoundSubjectScopeRequest;
import vn.edu.tass.backend.repository.RoundSubjectScopeRepository;
import vn.edu.tass.backend.service.RoundSubjectScopeService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class RoundSubjectScopeServiceImpl implements RoundSubjectScopeService {
    private final RoundSubjectScopeRepository repository;

    public RoundSubjectScopeServiceImpl(RoundSubjectScopeRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoundSubjectScopeDto> retrieveAllRoundSubjectScope(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(this::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public RoundSubjectScopeDto retrieveById(long id) {
        return toDto(find(id));
    }

    @Override
    @Transactional
    public RoundSubjectScopeDto createRoundSubjectScope(RoundSubjectScopeRequest request) {
        RoundSubjectScope entity = new RoundSubjectScope();
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public RoundSubjectScopeDto updateRoundSubjectScope(long id, RoundSubjectScopeRequest request) {
        RoundSubjectScope entity = find(id);
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteRoundSubjectScope(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private RoundSubjectScopeDto toDto(RoundSubjectScope entity) {
        RoundSubjectScopeDto dto = new RoundSubjectScopeDto();
        dto.setId(entity.getId());
        dto.setRoundId(entity.getRoundId());
        dto.setGradeId(entity.getGradeId());
        dto.setSubjectId(entity.getSubjectId());
        dto.setConfirmedBy(entity.getConfirmedBy());
        dto.setConfirmedAt(entity.getConfirmedAt());
        return dto;
    }

    private void applyRequest(RoundSubjectScopeRequest request, RoundSubjectScope entity) {
        entity.setRoundId(request.getRoundId());
        entity.setGradeId(request.getGradeId());
        entity.setSubjectId(request.getSubjectId());
        entity.setConfirmedBy(request.getConfirmedBy());
        entity.setConfirmedAt(request.getConfirmedAt());
    }

    private RoundSubjectScope find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("round_subject_scope id=" + id + " does not exist"));
    }
}