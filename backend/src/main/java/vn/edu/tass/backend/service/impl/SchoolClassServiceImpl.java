package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.SchoolClass;
import vn.edu.tass.backend.payload.dto.SchoolClassDto;
import vn.edu.tass.backend.payload.request.SchoolClassRequest;
import vn.edu.tass.backend.repository.SchoolClassRepository;
import vn.edu.tass.backend.service.SchoolClassService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class SchoolClassServiceImpl implements SchoolClassService {
    private final SchoolClassRepository repository;
    private final ModelMapper mapper;

    public SchoolClassServiceImpl(SchoolClassRepository repository, ModelMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SchoolClassDto> retrieveAllSchoolClass(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(entity -> mapper.map(entity, SchoolClassDto.class)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SchoolClassDto retrieveById(long id) {
        return mapper.map(find(id), SchoolClassDto.class);
    }

    @Override
    @Transactional
    public SchoolClassDto createSchoolClass(SchoolClassRequest request) {
        SchoolClass entity = mapper.map(request, SchoolClass.class);
        return mapper.map(repository.saveAndFlush(entity), SchoolClassDto.class);
    }

    @Override
    @Transactional
    public SchoolClassDto updateSchoolClass(long id, SchoolClassRequest request) {
        SchoolClass entity = find(id);
        entity.setAcademicYearId(request.getAcademicYearId());
        entity.setGradeId(request.getGradeId());
        entity.setClassCode(request.getClassCode());
        entity.setStatus(request.getStatus());
        return mapper.map(repository.saveAndFlush(entity), SchoolClassDto.class);
    }

    @Override
    @Transactional
    public void deleteSchoolClass(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private SchoolClass find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("school_class id=" + id + " does not exist"));
    }
}