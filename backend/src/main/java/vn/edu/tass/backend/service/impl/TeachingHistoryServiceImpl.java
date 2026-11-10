package vn.edu.tass.backend.service.impl;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.TeachingHistory;
import vn.edu.tass.backend.exception.NotFoundException;
import vn.edu.tass.backend.mapper.TeachingHistoryMapper;
import vn.edu.tass.backend.payload.dto.TeachingHistoryDto;
import vn.edu.tass.backend.payload.request.TeachingHistoryRequest;
import vn.edu.tass.backend.repository.TeachingHistoryRepository;
import vn.edu.tass.backend.service.TeachingHistoryService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.InputSpecifications;
import vn.edu.tass.backend.utils.OffsetLimitPageable;
import vn.edu.tass.backend.utils.InputRecordRules;

@Service
public class TeachingHistoryServiceImpl implements TeachingHistoryService {
    private final TeachingHistoryRepository repository;
    private final TeachingHistoryMapper mapper;

    public TeachingHistoryServiceImpl(TeachingHistoryRepository repository, TeachingHistoryMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeachingHistoryDto> retrieveAllTeachingHistory(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream().map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeachingHistoryDto> searchTeachingHistory(int limit, int offset, Long teacherId, Long semesterId, Long classId, Long subjectId, String verificationStatus, LocalDate asOf) {
        CrudParameters.requirePage(limit, offset);
        InputSpecifications.requirePositive(teacherId, "teacher_id");
        InputSpecifications.requirePositive(semesterId, "semester_id");
        InputSpecifications.requirePositive(classId, "class_id");
        InputSpecifications.requirePositive(subjectId, "subject_id");
        Specification<TeachingHistory> filters = Specification.allOf(
            InputSpecifications.equal("teacherId", teacherId),
            InputSpecifications.equal("semesterId", semesterId),
            InputSpecifications.equal("classId", classId),
            InputSpecifications.equal("subjectId", subjectId),
            InputSpecifications.equal("verificationStatus", InputSpecifications.optionalText(verificationStatus, "verification_status")),
            InputSpecifications.activeOn("taughtFrom", "taughtTo", asOf));
        return repository.findAll(filters, new OffsetLimitPageable(limit, offset)).stream().map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeachingHistoryDto retrieveById(long id) {
        return mapper.toDto(find(id));
    }

    @Override
    @Transactional
    public TeachingHistoryDto createTeachingHistory(TeachingHistoryRequest request) {
        InputRecordRules.validate(request);
        return mapper.toDto(repository.saveAndFlush(mapper.toEntity(request)));
    }

    @Override
    @Transactional
    public TeachingHistoryDto updateTeachingHistory(long id, TeachingHistoryRequest request) {
        InputRecordRules.validate(request);
        TeachingHistory entity = find(id);
        mapper.applyRequest(request, entity);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteTeachingHistory(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private TeachingHistory find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new NotFoundException("teaching_history id=" + id + " does not exist"));
    }
}
