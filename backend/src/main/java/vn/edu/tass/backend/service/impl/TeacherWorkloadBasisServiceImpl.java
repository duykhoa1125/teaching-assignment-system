package vn.edu.tass.backend.service.impl;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.TeacherWorkloadBasis;
import vn.edu.tass.backend.exception.NotFoundException;
import vn.edu.tass.backend.mapper.TeacherWorkloadBasisMapper;
import vn.edu.tass.backend.payload.dto.TeacherWorkloadBasisDto;
import vn.edu.tass.backend.payload.request.TeacherWorkloadBasisRequest;
import vn.edu.tass.backend.repository.TeacherWorkloadBasisRepository;
import vn.edu.tass.backend.service.TeacherWorkloadBasisService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.InputSpecifications;
import vn.edu.tass.backend.utils.OffsetLimitPageable;
import vn.edu.tass.backend.utils.InputRecordRules;

@Service
public class TeacherWorkloadBasisServiceImpl implements TeacherWorkloadBasisService {
    private final TeacherWorkloadBasisRepository repository;
    private final TeacherWorkloadBasisMapper mapper;

    public TeacherWorkloadBasisServiceImpl(TeacherWorkloadBasisRepository repository, TeacherWorkloadBasisMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeacherWorkloadBasisDto> retrieveAllTeacherWorkloadBasis(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream().map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeacherWorkloadBasisDto> searchTeacherWorkloadBasis(int limit, int offset, Long teacherId, Long semesterId, Long educationLevelId, String verificationStatus, LocalDate asOf) {
        CrudParameters.requirePage(limit, offset);
        InputSpecifications.requirePositive(teacherId, "teacher_id");
        InputSpecifications.requirePositive(semesterId, "semester_id");
        InputSpecifications.requirePositive(educationLevelId, "education_level_id");
        Specification<TeacherWorkloadBasis> filters = Specification.allOf(
            InputSpecifications.equal("teacherId", teacherId),
            InputSpecifications.equal("semesterId", semesterId),
            InputSpecifications.equal("educationLevelId", educationLevelId),
            InputSpecifications.equal("verificationStatus", InputSpecifications.optionalText(verificationStatus, "verification_status")),
            InputSpecifications.activeOn("validFrom", "validTo", asOf));
        return repository.findAll(filters, new OffsetLimitPageable(limit, offset)).stream().map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeacherWorkloadBasisDto retrieveById(long id) {
        return mapper.toDto(find(id));
    }

    @Override
    @Transactional
    public TeacherWorkloadBasisDto createTeacherWorkloadBasis(TeacherWorkloadBasisRequest request) {
        InputRecordRules.validate(request);
        return mapper.toDto(repository.saveAndFlush(mapper.toEntity(request)));
    }

    @Override
    @Transactional
    public TeacherWorkloadBasisDto updateTeacherWorkloadBasis(long id, TeacherWorkloadBasisRequest request) {
        InputRecordRules.validate(request);
        TeacherWorkloadBasis entity = find(id);
        mapper.applyRequest(request, entity);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteTeacherWorkloadBasis(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private TeacherWorkloadBasis find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new NotFoundException("teacher_workload_basis id=" + id + " does not exist"));
    }
}
