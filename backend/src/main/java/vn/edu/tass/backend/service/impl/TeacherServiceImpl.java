package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.Teacher;
import vn.edu.tass.backend.mapper.TeacherMapper;
import vn.edu.tass.backend.payload.dto.TeacherDto;
import vn.edu.tass.backend.payload.request.TeacherRequest;
import vn.edu.tass.backend.repository.TeacherRepository;
import vn.edu.tass.backend.service.TeacherService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.InputSpecifications;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class TeacherServiceImpl implements TeacherService {
    private final TeacherRepository repository;
    private final TeacherMapper mapper;

    public TeacherServiceImpl(TeacherRepository repository, TeacherMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeacherDto> retrieveAllTeacher(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeacherDto> searchTeacher(int limit, int offset, Long schoolId, String teacherCode, String q) {
        CrudParameters.requirePage(limit, offset);
        InputSpecifications.requirePositive(schoolId, "school_id");
        Specification<vn.edu.tass.backend.entity.Teacher> filters = Specification.allOf(
            InputSpecifications.equal("schoolId", schoolId),
            InputSpecifications.equal("teacherCode", InputSpecifications.optionalText(teacherCode, "teacher_code")),
            InputSpecifications.containsIgnoreCase("fullName", InputSpecifications.optionalText(q, "q")));
        return repository.findAll(filters, new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeacherDto retrieveById(long id) {
        return mapper.toDto(find(id));
    }

    @Override
    @Transactional
    public TeacherDto createTeacher(TeacherRequest request) {
        Teacher entity = mapper.toEntity(request);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public TeacherDto updateTeacher(long id, TeacherRequest request) {
        Teacher entity = find(id);
        mapper.applyRequest(request, entity);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteTeacher(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private Teacher find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("teacher id=" + id + " does not exist"));
    }
}
