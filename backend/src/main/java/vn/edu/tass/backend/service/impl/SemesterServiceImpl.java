package vn.edu.tass.backend.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.tass.backend.entity.Semester;
import vn.edu.tass.backend.payload.request.SemesterRequest;
import vn.edu.tass.backend.repository.SemesterRepository;
import vn.edu.tass.backend.service.SemesterService;
import vn.edu.tass.backend.service.support.CrudSupport;

@Service
public class SemesterServiceImpl implements SemesterService {
    private final CrudSupport<Semester> crud;

    public SemesterServiceImpl(SemesterRepository repository) {
        this.crud = new CrudSupport<>(repository);
    }

    @Transactional(readOnly = true)
    public List<Semester> list(int limit, int offset) { return crud.list(limit, offset); }

    @Transactional(readOnly = true)
    public Semester get(long id) { return crud.get(id); }

    @Transactional
    public Semester create(SemesterRequest request) { return crud.create(request); }

    @Transactional
    public Semester replace(long id, SemesterRequest request) { return crud.replace(id, request); }

    @Transactional
    public void delete(long id) { crud.delete(id); }
}
