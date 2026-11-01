package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.Semester;
import vn.edu.tass.backend.payload.dto.SemesterDto;
import vn.edu.tass.backend.payload.request.SemesterRequest;
import vn.edu.tass.backend.repository.SemesterRepository;
import vn.edu.tass.backend.service.SemesterService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class SemesterServiceImpl implements SemesterService {
    private final SemesterRepository repository;

    public SemesterServiceImpl(SemesterRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SemesterDto> retrieveAllSemester(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(this::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SemesterDto retrieveById(long id) {
        return toDto(find(id));
    }

    @Override
    @Transactional
    public SemesterDto createSemester(SemesterRequest request) {
        Semester entity = new Semester();
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public SemesterDto updateSemester(long id, SemesterRequest request) {
        Semester entity = find(id);
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteSemester(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private SemesterDto toDto(Semester entity) {
        SemesterDto dto = new SemesterDto();
        dto.setId(entity.getId());
        dto.setAcademicYearId(entity.getAcademicYearId());
        dto.setSemesterNo(entity.getSemesterNo());
        dto.setStartsOn(entity.getStartsOn());
        dto.setEndsOn(entity.getEndsOn());
        return dto;
    }

    private void applyRequest(SemesterRequest request, Semester entity) {
        entity.setAcademicYearId(request.getAcademicYearId());
        entity.setSemesterNo(request.getSemesterNo());
        entity.setStartsOn(request.getStartsOn());
        entity.setEndsOn(request.getEndsOn());
    }

    private Semester find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("semester id=" + id + " does not exist"));
    }
}