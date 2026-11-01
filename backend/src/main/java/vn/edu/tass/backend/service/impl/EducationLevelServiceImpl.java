package vn.edu.tass.backend.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.tass.backend.entity.EducationLevel;
import vn.edu.tass.backend.payload.request.EducationLevelRequest;
import vn.edu.tass.backend.repository.EducationLevelRepository;
import vn.edu.tass.backend.service.EducationLevelService;
import vn.edu.tass.backend.service.support.CrudSupport;

@Service
public class EducationLevelServiceImpl implements EducationLevelService {
    private final CrudSupport<EducationLevel> crud;

    public EducationLevelServiceImpl(EducationLevelRepository repository) {
        this.crud = new CrudSupport<>(repository);
    }

    @Transactional(readOnly = true)
    public List<EducationLevel> list(int limit, int offset) { return crud.list(limit, offset); }

    @Transactional(readOnly = true)
    public EducationLevel get(long id) { return crud.get(id); }

    @Transactional
    public EducationLevel create(EducationLevelRequest request) { return crud.create(request); }

    @Transactional
    public EducationLevel replace(long id, EducationLevelRequest request) { return crud.replace(id, request); }

    @Transactional
    public void delete(long id) { crud.delete(id); }
}
