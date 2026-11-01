package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.modelmapper.ModelMapper;
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
    private final ModelMapper mapper;

    public TeacherEmploymentServiceImpl(TeacherEmploymentRepository repository, ModelMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeacherEmploymentDto> retrieveAllTeacherEmployment(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(entity -> mapper.map(entity, TeacherEmploymentDto.class)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeacherEmploymentDto retrieveById(long id) {
        return mapper.map(find(id), TeacherEmploymentDto.class);
    }

    @Override
    @Transactional
    public TeacherEmploymentDto createTeacherEmployment(TeacherEmploymentRequest request) {
        TeacherEmployment entity = mapper.map(request, TeacherEmployment.class);
        return mapper.map(repository.saveAndFlush(entity), TeacherEmploymentDto.class);
    }

    @Override
    @Transactional
    public TeacherEmploymentDto updateTeacherEmployment(long id, TeacherEmploymentRequest request) {
        TeacherEmployment entity = find(id);
        entity.setTeacherId(request.getTeacherId());
        entity.setDepartmentId(request.getDepartmentId());
        entity.setSemesterId(request.getSemesterId());
        entity.setEmploymentStatus(request.getEmploymentStatus());
        entity.setPositionCode(request.getPositionCode());
        entity.setValidFrom(request.getValidFrom());
        entity.setValidTo(request.getValidTo());
        return mapper.map(repository.saveAndFlush(entity), TeacherEmploymentDto.class);
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