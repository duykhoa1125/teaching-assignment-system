package vn.edu.tass.backend.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.tass.backend.entity.Subject;
import vn.edu.tass.backend.payload.request.SubjectRequest;
import vn.edu.tass.backend.repository.SubjectRepository;
import vn.edu.tass.backend.service.SubjectService;
import vn.edu.tass.backend.service.support.CrudSupport;

@Service
public class SubjectServiceImpl implements SubjectService {
    private final CrudSupport<Subject> crud;

    public SubjectServiceImpl(SubjectRepository repository) {
        this.crud = new CrudSupport<>(repository);
    }

    @Transactional(readOnly = true)
    public List<Subject> list(int limit, int offset) { return crud.list(limit, offset); }

    @Transactional(readOnly = true)
    public Subject get(long id) { return crud.get(id); }

    @Transactional
    public Subject create(SubjectRequest request) { return crud.create(request); }

    @Transactional
    public Subject replace(long id, SubjectRequest request) { return crud.replace(id, request); }

    @Transactional
    public void delete(long id) { crud.delete(id); }
}
