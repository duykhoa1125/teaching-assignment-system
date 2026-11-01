package vn.edu.tass.backend.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.tass.backend.entity.Department;
import vn.edu.tass.backend.payload.request.DepartmentRequest;
import vn.edu.tass.backend.repository.DepartmentRepository;
import vn.edu.tass.backend.service.DepartmentService;
import vn.edu.tass.backend.service.support.CrudSupport;

@Service
public class DepartmentServiceImpl implements DepartmentService {
    private final CrudSupport<Department> crud;

    public DepartmentServiceImpl(DepartmentRepository repository) {
        this.crud = new CrudSupport<>(repository);
    }

    @Transactional(readOnly = true)
    public List<Department> list(int limit, int offset) { return crud.list(limit, offset); }

    @Transactional(readOnly = true)
    public Department get(long id) { return crud.get(id); }

    @Transactional
    public Department create(DepartmentRequest request) { return crud.create(request); }

    @Transactional
    public Department replace(long id, DepartmentRequest request) { return crud.replace(id, request); }

    @Transactional
    public void delete(long id) { crud.delete(id); }
}
