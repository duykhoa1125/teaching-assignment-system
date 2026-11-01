package vn.edu.tass.backend.service;

import java.util.List;

import vn.edu.tass.backend.entity.Department;
import vn.edu.tass.backend.payload.request.DepartmentRequest;

public interface DepartmentService {
    List<Department> list(int limit, int offset);
    Department get(long id);
    Department create(DepartmentRequest request);
    Department replace(long id, DepartmentRequest request);
    void delete(long id);
}
