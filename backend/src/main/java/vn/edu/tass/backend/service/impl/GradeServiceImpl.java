package vn.edu.tass.backend.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.tass.backend.entity.Grade;
import vn.edu.tass.backend.payload.request.GradeRequest;
import vn.edu.tass.backend.repository.GradeRepository;
import vn.edu.tass.backend.service.GradeService;
import vn.edu.tass.backend.service.support.CrudSupport;

@Service
public class GradeServiceImpl implements GradeService {
    private final CrudSupport<Grade> crud;

    public GradeServiceImpl(GradeRepository repository) {
        this.crud = new CrudSupport<>(repository);
    }

    @Transactional(readOnly = true)
    public List<Grade> list(int limit, int offset) { return crud.list(limit, offset); }

    @Transactional(readOnly = true)
    public Grade get(long id) { return crud.get(id); }

    @Transactional
    public Grade create(GradeRequest request) { return crud.create(request); }

    @Transactional
    public Grade replace(long id, GradeRequest request) { return crud.replace(id, request); }

    @Transactional
    public void delete(long id) { crud.delete(id); }
}
