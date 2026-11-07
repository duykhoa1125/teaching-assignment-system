package vn.edu.tass.backend.service;

import java.util.List;
import vn.edu.tass.backend.payload.dto.DepartmentDto;
import vn.edu.tass.backend.payload.request.DepartmentRequest;

public interface DepartmentService {
    List<DepartmentDto> retrieveAllDepartment(int limit, int offset);
    DepartmentDto retrieveById(long id);
    DepartmentDto createDepartment(DepartmentRequest request);
    DepartmentDto updateDepartment(long id, DepartmentRequest request);
    void deleteDepartment(long id);
}