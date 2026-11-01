package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.TeacherEmployment;
import vn.edu.tass.backend.payload.dto.TeacherEmploymentDto;
import vn.edu.tass.backend.payload.request.TeacherEmploymentRequest;
import vn.edu.tass.backend.repository.TeacherEmploymentRepository;
import vn.edu.tass.backend.service.TeacherEmploymentService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class TeacherEmploymentServiceImpl implements TeacherEmploymentService {
    private final TeacherEmploymentRepository repository;

    public TeacherEmploymentServiceImpl(TeacherEmploymentRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeacherEmploymentDto> retrieveAllTeacherEmployment(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(this::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeacherEmploymentDto retrieveById(long id) {
        return toDto(find(id));
    }

    @Override
    @Transactional
    public TeacherEmploymentDto createTeacherEmployment(TeacherEmploymentRequest request) {
        TeacherEmployment entity = new TeacherEmployment();
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public TeacherEmploymentDto updateTeacherEmployment(long id, TeacherEmploymentRequest request) {
        TeacherEmployment entity = find(id);
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteTeacherEmployment(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private TeacherEmploymentDto toDto(TeacherEmployment entity) {
        TeacherEmploymentDto dto = new TeacherEmploymentDto();
        dto.setId(entity.getId());
        dto.setTeacherId(entity.getTeacherId());
        dto.setDepartmentId(entity.getDepartmentId());
        dto.setSemesterId(entity.getSemesterId());
        dto.setEmploymentStatus(entity.getEmploymentStatus());
        dto.setPositionCode(entity.getPositionCode());
        dto.setValidFrom(entity.getValidFrom());
        dto.setValidTo(entity.getValidTo());
        return dto;
    }

    private void applyRequest(TeacherEmploymentRequest request, TeacherEmployment entity) {
        entity.setTeacherId(request.getTeacherId());
        entity.setDepartmentId(request.getDepartmentId());
        entity.setSemesterId(request.getSemesterId());
        entity.setEmploymentStatus(request.getEmploymentStatus());
        entity.setPositionCode(request.getPositionCode());
        entity.setValidFrom(request.getValidFrom());
        entity.setValidTo(request.getValidTo());
    }

    private TeacherEmployment find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("teacher_employment id=" + id + " does not exist"));
    }
}