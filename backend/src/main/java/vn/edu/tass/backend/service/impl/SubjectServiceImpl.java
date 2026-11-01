package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.Subject;
import vn.edu.tass.backend.payload.dto.SubjectDto;
import vn.edu.tass.backend.payload.request.SubjectRequest;
import vn.edu.tass.backend.repository.SubjectRepository;
import vn.edu.tass.backend.service.SubjectService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class SubjectServiceImpl implements SubjectService {
    private final SubjectRepository repository;

    public SubjectServiceImpl(SubjectRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SubjectDto> retrieveAllSubject(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(this::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SubjectDto retrieveById(long id) {
        return toDto(find(id));
    }

    @Override
    @Transactional
    public SubjectDto createSubject(SubjectRequest request) {
        Subject entity = new Subject();
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public SubjectDto updateSubject(long id, SubjectRequest request) {
        Subject entity = find(id);
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteSubject(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private SubjectDto toDto(Subject entity) {
        SubjectDto dto = new SubjectDto();
        dto.setId(entity.getId());
        dto.setSubjectCode(entity.getSubjectCode());
        dto.setName(entity.getName());
        dto.setValidFrom(entity.getValidFrom());
        dto.setValidTo(entity.getValidTo());
        return dto;
    }

    private void applyRequest(SubjectRequest request, Subject entity) {
        entity.setSubjectCode(request.getSubjectCode());
        entity.setName(request.getName());
        entity.setValidFrom(request.getValidFrom());
        entity.setValidTo(request.getValidTo());
    }

    private Subject find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("subject id=" + id + " does not exist"));
    }
}