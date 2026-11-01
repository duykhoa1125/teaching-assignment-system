package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.AcademicYear;
import vn.edu.tass.backend.payload.dto.AcademicYearDto;
import vn.edu.tass.backend.payload.request.AcademicYearRequest;
import vn.edu.tass.backend.repository.AcademicYearRepository;
import vn.edu.tass.backend.service.AcademicYearService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class AcademicYearServiceImpl implements AcademicYearService {
    private final AcademicYearRepository repository;

    public AcademicYearServiceImpl(AcademicYearRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AcademicYearDto> retrieveAllAcademicYear(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(this::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AcademicYearDto retrieveById(long id) {
        return toDto(find(id));
    }

    @Override
    @Transactional
    public AcademicYearDto createAcademicYear(AcademicYearRequest request) {
        AcademicYear entity = new AcademicYear();
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public AcademicYearDto updateAcademicYear(long id, AcademicYearRequest request) {
        AcademicYear entity = find(id);
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteAcademicYear(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private AcademicYearDto toDto(AcademicYear entity) {
        AcademicYearDto dto = new AcademicYearDto();
        dto.setId(entity.getId());
        dto.setSchoolId(entity.getSchoolId());
        dto.setYearCode(entity.getYearCode());
        dto.setStartsOn(entity.getStartsOn());
        dto.setEndsOn(entity.getEndsOn());
        return dto;
    }

    private void applyRequest(AcademicYearRequest request, AcademicYear entity) {
        entity.setSchoolId(request.getSchoolId());
        entity.setYearCode(request.getYearCode());
        entity.setStartsOn(request.getStartsOn());
        entity.setEndsOn(request.getEndsOn());
    }

    private AcademicYear find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("academic_year id=" + id + " does not exist"));
    }
}