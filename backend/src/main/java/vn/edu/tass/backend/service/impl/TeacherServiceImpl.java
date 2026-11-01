package vn.edu.tass.backend.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.tass.backend.entity.Teacher;
import vn.edu.tass.backend.payload.request.TeacherRequest;
import vn.edu.tass.backend.repository.TeacherRepository;
import vn.edu.tass.backend.service.TeacherService;
import vn.edu.tass.backend.service.support.CrudSupport;

@Service
public class TeacherServiceImpl implements TeacherService {
    private final CrudSupport<Teacher> crud;

    public TeacherServiceImpl(TeacherRepository repository) {
        this.crud = new CrudSupport<>(repository);
    }

    @Transactional(readOnly = true)
    public List<Teacher> list(int limit, int offset) { return crud.list(limit, offset); }

    @Transactional(readOnly = true)
    public Teacher get(long id) { return crud.get(id); }

    @Transactional
    public Teacher create(TeacherRequest request) { return crud.create(request); }

    @Transactional
    public Teacher replace(long id, TeacherRequest request) { return crud.replace(id, request); }

    @Transactional
    public void delete(long id) { crud.delete(id); }
}
