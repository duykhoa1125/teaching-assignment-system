package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.modelmapper.ModelMapper;
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
    private final ModelMapper mapper;

    public RoundSubjectScopeServiceImpl(RoundSubjectScopeRepository repository, ModelMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoundSubjectScopeDto> retrieveAllRoundSubjectScope(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(entity -> mapper.map(entity, RoundSubjectScopeDto.class)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public RoundSubjectScopeDto retrieveById(long id) {
        return mapper.map(find(id), RoundSubjectScopeDto.class);
    }

    @Override
    @Transactional
    public RoundSubjectScopeDto createRoundSubjectScope(RoundSubjectScopeRequest request) {
        RoundSubjectScope entity = mapper.map(request, RoundSubjectScope.class);
        return mapper.map(repository.saveAndFlush(entity), RoundSubjectScopeDto.class);
    }

    @Override
    @Transactional
    public RoundSubjectScopeDto updateRoundSubjectScope(long id, RoundSubjectScopeRequest request) {
        RoundSubjectScope entity = find(id);
        entity.setRoundId(request.getRoundId());
        entity.setGradeId(request.getGradeId());
        entity.setSubjectId(request.getSubjectId());
        entity.setConfirmedBy(request.getConfirmedBy());
        entity.setConfirmedAt(request.getConfirmedAt());
        return mapper.map(repository.saveAndFlush(entity), RoundSubjectScopeDto.class);
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