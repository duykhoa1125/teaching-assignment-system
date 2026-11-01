package vn.edu.tass.backend.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.tass.backend.entity.School;
import vn.edu.tass.backend.payload.request.SchoolRequest;
import vn.edu.tass.backend.repository.SchoolRepository;
import vn.edu.tass.backend.service.SchoolService;
import vn.edu.tass.backend.service.support.CrudSupport;

@Service
public class SchoolServiceImpl implements SchoolService {
    private final CrudSupport<School> crud;

    public SchoolServiceImpl(SchoolRepository repository) {
        this.crud = new CrudSupport<>(repository);
    }

    @Transactional(readOnly = true)
    public List<School> list(int limit, int offset) { return crud.list(limit, offset); }

    @Transactional(readOnly = true)
    public School get(long id) { return crud.get(id); }

    @Transactional
    public School create(SchoolRequest request) { return crud.create(request); }

    @Transactional
    public School replace(long id, SchoolRequest request) { return crud.replace(id, request); }

    @Transactional
    public void delete(long id) { crud.delete(id); }
}
