package vn.edu.tass.backend.service.impl;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.TeacherDuty;
import vn.edu.tass.backend.exception.NotFoundException;
import vn.edu.tass.backend.mapper.TeacherDutyMapper;
import vn.edu.tass.backend.payload.dto.TeacherDutyDto;
import vn.edu.tass.backend.payload.request.TeacherDutyRequest;
import vn.edu.tass.backend.repository.TeacherDutyRepository;
import vn.edu.tass.backend.service.TeacherDutyService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.InputSpecifications;
import vn.edu.tass.backend.utils.OffsetLimitPageable;
import vn.edu.tass.backend.utils.InputRecordRules;

@Service
public class TeacherDutyServiceImpl implements TeacherDutyService {
    private final TeacherDutyRepository repository;
    private final TeacherDutyMapper mapper;

    public TeacherDutyServiceImpl(TeacherDutyRepository repository, TeacherDutyMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeacherDutyDto> retrieveAllTeacherDuty(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream().map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeacherDutyDto> searchTeacherDuty(int limit, int offset, Long teacherId, Long semesterId, String dutyType, String verificationStatus, LocalDate asOf) {
        CrudParameters.requirePage(limit, offset);
        InputSpecifications.requirePositive(teacherId, "teacher_id");
        InputSpecifications.requirePositive(semesterId, "semester_id");
        Specification<TeacherDuty> filters = Specification.allOf(
            InputSpecifications.equal("teacherId", teacherId),
            InputSpecifications.equal("semesterId", semesterId),
            InputSpecifications.equal("dutyType", InputSpecifications.optionalText(dutyType, "duty_type")),
            InputSpecifications.equal("verificationStatus", InputSpecifications.optionalText(verificationStatus, "verification_status")),
            InputSpecifications.activeOn("validFrom", "validTo", asOf));
        return repository.findAll(filters, new OffsetLimitPageable(limit, offset)).stream().map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeacherDutyDto retrieveById(long id) {
        return mapper.toDto(find(id));
    }

    @Override
    @Transactional
    public TeacherDutyDto createTeacherDuty(TeacherDutyRequest request) {
        InputRecordRules.validate(request);
        return mapper.toDto(repository.saveAndFlush(mapper.toEntity(request)));
    }

    @Override
    @Transactional
    public TeacherDutyDto updateTeacherDuty(long id, TeacherDutyRequest request) {
        InputRecordRules.validate(request);
        TeacherDuty entity = find(id);
        mapper.applyRequest(request, entity);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteTeacherDuty(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private TeacherDuty find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new NotFoundException("teacher_duty id=" + id + " does not exist"));
    }
}
