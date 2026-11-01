package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.modelmapper.ModelMapper;
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
    private final ModelMapper mapper;

    public DepartmentServiceImpl(DepartmentRepository repository, ModelMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentDto> retrieveAllDepartment(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(entity -> mapper.map(entity, DepartmentDto.class)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DepartmentDto retrieveById(long id) {
        return mapper.map(find(id), DepartmentDto.class);
    }

    @Override
    @Transactional
    public DepartmentDto createDepartment(DepartmentRequest request) {
        Department entity = mapper.map(request, Department.class);
        return mapper.map(repository.saveAndFlush(entity), DepartmentDto.class);
    }

    @Override
    @Transactional
    public DepartmentDto updateDepartment(long id, DepartmentRequest request) {
        Department entity = find(id);
        entity.setSchoolId(request.getSchoolId());
        entity.setDepartmentCode(request.getDepartmentCode());
        entity.setName(request.getName());
        entity.setValidFrom(request.getValidFrom());
        entity.setValidTo(request.getValidTo());
        return mapper.map(repository.saveAndFlush(entity), DepartmentDto.class);
    }

    @Override
    @Transactional
    public void deleteDepartment(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private Department find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("department id=" + id + " does not exist"));
    }
}