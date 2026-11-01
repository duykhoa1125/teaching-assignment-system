package vn.edu.tass.backend.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.tass.backend.entity.TeacherEmployment;
import vn.edu.tass.backend.payload.request.TeacherEmploymentRequest;
import vn.edu.tass.backend.repository.TeacherEmploymentRepository;
import vn.edu.tass.backend.service.TeacherEmploymentService;
import vn.edu.tass.backend.service.support.CrudSupport;

@Service
public class TeacherEmploymentServiceImpl implements TeacherEmploymentService {
    private final CrudSupport<TeacherEmployment> crud;

    public TeacherEmploymentServiceImpl(TeacherEmploymentRepository repository) {
        this.crud = new CrudSupport<>(repository);
    }

    @Transactional(readOnly = true)
    public List<TeacherEmployment> list(int limit, int offset) { return crud.list(limit, offset); }

    @Transactional(readOnly = true)
    public TeacherEmployment get(long id) { return crud.get(id); }

    @Transactional
    public TeacherEmployment create(TeacherEmploymentRequest request) { return crud.create(request); }

    @Transactional
    public TeacherEmployment replace(long id, TeacherEmploymentRequest request) { return crud.replace(id, request); }

    @Transactional
    public void delete(long id) { crud.delete(id); }
}
