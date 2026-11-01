package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.Teacher;
import vn.edu.tass.backend.payload.dto.TeacherDto;
import vn.edu.tass.backend.payload.request.TeacherRequest;
import vn.edu.tass.backend.repository.TeacherRepository;
import vn.edu.tass.backend.service.TeacherService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class TeacherServiceImpl implements TeacherService {
    private final TeacherRepository repository;

    public TeacherServiceImpl(TeacherRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeacherDto> retrieveAllTeacher(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(this::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeacherDto retrieveById(long id) {
        return toDto(find(id));
    }

    @Override
    @Transactional
    public TeacherDto createTeacher(TeacherRequest request) {
        Teacher entity = new Teacher();
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public TeacherDto updateTeacher(long id, TeacherRequest request) {
        Teacher entity = find(id);
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteTeacher(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private TeacherDto toDto(Teacher entity) {
        TeacherDto dto = new TeacherDto();
        dto.setId(entity.getId());
        dto.setSchoolId(entity.getSchoolId());
        dto.setTeacherCode(entity.getTeacherCode());
        dto.setFullName(entity.getFullName());
        return dto;
    }

    private void applyRequest(TeacherRequest request, Teacher entity) {
        entity.setSchoolId(request.getSchoolId());
        entity.setTeacherCode(request.getTeacherCode());
        entity.setFullName(request.getFullName());
    }

    private Teacher find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("teacher id=" + id + " does not exist"));
    }
}