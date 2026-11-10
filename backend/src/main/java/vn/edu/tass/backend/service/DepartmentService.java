package vn.edu.tass.backend.service;

import java.time.LocalDate;
import java.util.List;
import vn.edu.tass.backend.payload.dto.DepartmentDto;
import vn.edu.tass.backend.payload.request.DepartmentRequest;

public interface DepartmentService {
    List<DepartmentDto> retrieveAllDepartment(int limit, int offset);
    List<DepartmentDto> searchDepartment(int limit, int offset, Long schoolId, LocalDate asOf);
    DepartmentDto retrieveById(long id);
    DepartmentDto createDepartment(DepartmentRequest request);
    DepartmentDto updateDepartment(long id, DepartmentRequest request);
    void deleteDepartment(long id);
}
