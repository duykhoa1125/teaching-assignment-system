package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.SchoolClass;
import vn.edu.tass.backend.mapper.SchoolClassMapper;
import vn.edu.tass.backend.payload.dto.SchoolClassDto;
import vn.edu.tass.backend.payload.request.SchoolClassRequest;
import vn.edu.tass.backend.repository.SchoolClassRepository;
import vn.edu.tass.backend.service.SchoolClassService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.InputSpecifications;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class SchoolClassServiceImpl implements SchoolClassService {
    private final SchoolClassRepository repository;
    private final SchoolClassMapper mapper;

    public SchoolClassServiceImpl(SchoolClassRepository repository, SchoolClassMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SchoolClassDto> retrieveAllSchoolClass(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SchoolClassDto> searchSchoolClass(int limit, int offset, Long academicYearId, Long gradeId, String status) {
        CrudParameters.requirePage(limit, offset);
        InputSpecifications.requirePositive(academicYearId, "academic_year_id");
        InputSpecifications.requirePositive(gradeId, "grade_id");
        Specification<vn.edu.tass.backend.entity.SchoolClass> filters = Specification.allOf(
            InputSpecifications.equal("academicYearId", academicYearId),
            InputSpecifications.equal("gradeId", gradeId),
            InputSpecifications.equal("status", InputSpecifications.optionalText(status, "status")));
        return repository.findAll(filters, new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SchoolClassDto retrieveById(long id) {
        return mapper.toDto(find(id));
    }

    @Override
    @Transactional
    public SchoolClassDto createSchoolClass(SchoolClassRequest request) {
        SchoolClass entity = mapper.toEntity(request);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public SchoolClassDto updateSchoolClass(long id, SchoolClassRequest request) {
        SchoolClass entity = find(id);
        mapper.applyRequest(request, entity);
        return mapper.toDto(repository.saveAndFlush(entity));
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
