package vn.edu.tass.backend.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.tass.backend.entity.RoundSubjectScope;
import vn.edu.tass.backend.payload.request.RoundSubjectScopeRequest;
import vn.edu.tass.backend.repository.RoundSubjectScopeRepository;
import vn.edu.tass.backend.service.RoundSubjectScopeService;
import vn.edu.tass.backend.service.support.CrudSupport;

@Service
public class RoundSubjectScopeServiceImpl implements RoundSubjectScopeService {
    private final CrudSupport<RoundSubjectScope> crud;

    public RoundSubjectScopeServiceImpl(RoundSubjectScopeRepository repository) {
        this.crud = new CrudSupport<>(repository);
    }

    @Transactional(readOnly = true)
    public List<RoundSubjectScope> list(int limit, int offset) { return crud.list(limit, offset); }

    @Transactional(readOnly = true)
    public RoundSubjectScope get(long id) { return crud.get(id); }

    @Transactional
    public RoundSubjectScope create(RoundSubjectScopeRequest request) { return crud.create(request); }

    @Transactional
    public RoundSubjectScope replace(long id, RoundSubjectScopeRequest request) { return crud.replace(id, request); }

    @Transactional
    public void delete(long id) { crud.delete(id); }
}
