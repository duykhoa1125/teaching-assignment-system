package vn.edu.tass.backend.service.impl;

import java.util.List;
import java.time.LocalDate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.TeacherEmployment;
import vn.edu.tass.backend.mapper.TeacherEmploymentMapper;
import vn.edu.tass.backend.payload.dto.TeacherEmploymentDto;
import vn.edu.tass.backend.payload.request.TeacherEmploymentRequest;
import vn.edu.tass.backend.repository.TeacherEmploymentRepository;
import vn.edu.tass.backend.service.TeacherEmploymentService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.InputSpecifications;
import vn.edu.tass.backend.utils.InputRecordRules;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class TeacherEmploymentServiceImpl implements TeacherEmploymentService {
    private final TeacherEmploymentRepository repository;
    private final TeacherEmploymentMapper mapper;

    public TeacherEmploymentServiceImpl(TeacherEmploymentRepository repository, TeacherEmploymentMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeacherEmploymentDto> retrieveAllTeacherEmployment(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeacherEmploymentDto> searchTeacherEmployment(int limit, int offset, Long teacherId, Long departmentId, Long semesterId, String employmentStatus, LocalDate asOf) {
        CrudParameters.requirePage(limit, offset);
        InputSpecifications.requirePositive(teacherId, "teacher_id");
        InputSpecifications.requirePositive(departmentId, "department_id");
        InputSpecifications.requirePositive(semesterId, "semester_id");
        String statusFilter = InputSpecifications.optionalText(employmentStatus, "employment_status");
        if (statusFilter != null) InputRecordRules.employmentStatus(statusFilter);
        Specification<TeacherEmployment> filters = Specification.allOf(
            InputSpecifications.equal("teacherId", teacherId),
            InputSpecifications.equal("departmentId", departmentId),
            InputSpecifications.equal("semesterId", semesterId),
            InputSpecifications.equal("employmentStatus", statusFilter),
            InputSpecifications.activeOn("validFrom", "validTo", asOf));
        return repository.findAll(filters, new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeacherEmploymentDto retrieveById(long id) {
        return mapper.toDto(find(id));
    }

    @Override
    @Transactional
    public TeacherEmploymentDto createTeacherEmployment(TeacherEmploymentRequest request) {
        InputRecordRules.employmentStatus(request.getEmploymentStatus());
        InputRecordRules.optionalEnd(request.getValidFrom(), request.getValidTo(), "valid_from", "valid_to");
        TeacherEmployment entity = mapper.toEntity(request);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public TeacherEmploymentDto updateTeacherEmployment(long id, TeacherEmploymentRequest request) {
        InputRecordRules.employmentStatus(request.getEmploymentStatus());
        InputRecordRules.optionalEnd(request.getValidFrom(), request.getValidTo(), "valid_from", "valid_to");
        TeacherEmployment entity = find(id);
        mapper.applyRequest(request, entity);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteTeacherEmployment(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private TeacherEmployment find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("teacher_employment id=" + id + " does not exist"));
    }
}
