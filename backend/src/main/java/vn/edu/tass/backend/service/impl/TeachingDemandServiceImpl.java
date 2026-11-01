package vn.edu.tass.backend.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.tass.backend.entity.TeachingDemand;
import vn.edu.tass.backend.payload.request.TeachingDemandRequest;
import vn.edu.tass.backend.repository.TeachingDemandRepository;
import vn.edu.tass.backend.service.TeachingDemandService;
import vn.edu.tass.backend.service.support.CrudSupport;

@Service
public class TeachingDemandServiceImpl implements TeachingDemandService {
    private final CrudSupport<TeachingDemand> crud;

    public TeachingDemandServiceImpl(TeachingDemandRepository repository) {
        this.crud = new CrudSupport<>(repository);
    }

    @Transactional(readOnly = true)
    public List<TeachingDemand> list(int limit, int offset) { return crud.list(limit, offset); }

    @Transactional(readOnly = true)
    public TeachingDemand get(long id) { return crud.get(id); }

    @Transactional
    public TeachingDemand create(TeachingDemandRequest request) { return crud.create(request); }

    @Transactional
    public TeachingDemand replace(long id, TeachingDemandRequest request) { return crud.replace(id, request); }

    @Transactional
    public void delete(long id) { crud.delete(id); }
}
