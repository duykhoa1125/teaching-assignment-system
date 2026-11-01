package vn.edu.tass.backend.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.tass.backend.entity.SchoolClass;
import vn.edu.tass.backend.payload.request.SchoolClassRequest;
import vn.edu.tass.backend.repository.SchoolClassRepository;
import vn.edu.tass.backend.service.SchoolClassService;
import vn.edu.tass.backend.service.support.CrudSupport;

@Service
public class SchoolClassServiceImpl implements SchoolClassService {
    private final CrudSupport<SchoolClass> crud;

    public SchoolClassServiceImpl(SchoolClassRepository repository) {
        this.crud = new CrudSupport<>(repository);
    }

    @Transactional(readOnly = true)
    public List<SchoolClass> list(int limit, int offset) { return crud.list(limit, offset); }

    @Transactional(readOnly = true)
    public SchoolClass get(long id) { return crud.get(id); }

    @Transactional
    public SchoolClass create(SchoolClassRequest request) { return crud.create(request); }

    @Transactional
    public SchoolClass replace(long id, SchoolClassRequest request) { return crud.replace(id, request); }

    @Transactional
    public void delete(long id) { crud.delete(id); }
}
