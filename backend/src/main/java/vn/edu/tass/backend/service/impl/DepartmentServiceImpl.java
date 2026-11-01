package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.Department;
import vn.edu.tass.backend.payload.dto.DepartmentDto;
import vn.edu.tass.backend.payload.request.DepartmentRequest;
import vn.edu.tass.backend.repository.DepartmentRepository;
import vn.edu.tass.backend.service.DepartmentService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class DepartmentServiceImpl implements DepartmentService {
    private final DepartmentRepository repository;

    public DepartmentServiceImpl(DepartmentRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentDto> retrieveAllDepartment(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(this::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DepartmentDto retrieveById(long id) {
        return toDto(find(id));
    }

    @Override
    @Transactional
    public DepartmentDto createDepartment(DepartmentRequest request) {
        Department entity = new Department();
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public DepartmentDto updateDepartment(long id, DepartmentRequest request) {
        Department entity = find(id);
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteDepartment(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private DepartmentDto toDto(Department entity) {
        DepartmentDto dto = new DepartmentDto();
        dto.setId(entity.getId());
        dto.setSchoolId(entity.getSchoolId());
        dto.setDepartmentCode(entity.getDepartmentCode());
        dto.setName(entity.getName());
        dto.setValidFrom(entity.getValidFrom());
        dto.setValidTo(entity.getValidTo());
        return dto;
    }

    private void applyRequest(DepartmentRequest request, Department entity) {
        entity.setSchoolId(request.getSchoolId());
        entity.setDepartmentCode(request.getDepartmentCode());
        entity.setName(request.getName());
        entity.setValidFrom(request.getValidFrom());
        entity.setValidTo(request.getValidTo());
    }

    private Department find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("department id=" + id + " does not exist"));
    }
}