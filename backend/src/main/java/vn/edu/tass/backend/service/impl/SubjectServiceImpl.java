package vn.edu.tass.backend.service.impl;

import java.util.List;
import java.time.LocalDate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.Subject;
import vn.edu.tass.backend.mapper.SubjectMapper;
import vn.edu.tass.backend.payload.dto.SubjectDto;
import vn.edu.tass.backend.payload.request.SubjectRequest;
import vn.edu.tass.backend.repository.SubjectRepository;
import vn.edu.tass.backend.service.SubjectService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.InputRecordRules;
import vn.edu.tass.backend.utils.InputSpecifications;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class SubjectServiceImpl implements SubjectService {
    private final SubjectRepository repository;
    private final SubjectMapper mapper;

    public SubjectServiceImpl(SubjectRepository repository, SubjectMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SubjectDto> retrieveAllSubject(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SubjectDto> searchSubject(int limit, int offset, String subjectCode, String q, LocalDate asOf) {
        CrudParameters.requirePage(limit, offset);
        Specification<vn.edu.tass.backend.entity.Subject> filters = Specification.allOf(
            InputSpecifications.equal("subjectCode", InputSpecifications.optionalText(subjectCode, "subject_code")),
            InputSpecifications.containsIgnoreCase("name", InputSpecifications.optionalText(q, "q")),
            InputSpecifications.activeOn("validFrom", "validTo", asOf));
        return repository.findAll(filters, new OffsetLimitPageable(limit, offset)).stream()
            .map(mapper::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SubjectDto retrieveById(long id) {
        return mapper.toDto(find(id));
    }

    @Override
    @Transactional
    public SubjectDto createSubject(SubjectRequest request) {
        if (request.getValidTo() != null) {
            InputRecordRules.dates(request.getValidFrom(), request.getValidTo(), "valid_from", "valid_to");
        }
        Subject entity = mapper.toEntity(request);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public SubjectDto updateSubject(long id, SubjectRequest request) {
        if (request.getValidTo() != null) {
            InputRecordRules.dates(request.getValidFrom(), request.getValidTo(), "valid_from", "valid_to");
        }
        Subject entity = find(id);
        mapper.applyRequest(request, entity);
        return mapper.toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteSubject(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private Subject find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("subject id=" + id + " does not exist"));
    }
}
