package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.modelmapper.ModelMapper;
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
    private final ModelMapper mapper;

    public TeacherServiceImpl(TeacherRepository repository, ModelMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeacherDto> retrieveAllTeacher(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(entity -> mapper.map(entity, TeacherDto.class)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeacherDto retrieveById(long id) {
        return mapper.map(find(id), TeacherDto.class);
    }

    @Override
    @Transactional
    public TeacherDto createTeacher(TeacherRequest request) {
        Teacher entity = mapper.map(request, Teacher.class);
        return mapper.map(repository.saveAndFlush(entity), TeacherDto.class);
    }

    @Override
    @Transactional
    public TeacherDto updateTeacher(long id, TeacherRequest request) {
        Teacher entity = find(id);
        entity.setSchoolId(request.getSchoolId());
        entity.setTeacherCode(request.getTeacherCode());
        entity.setFullName(request.getFullName());
        return mapper.map(repository.saveAndFlush(entity), TeacherDto.class);
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