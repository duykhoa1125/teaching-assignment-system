package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.modelmapper.ModelMapper;
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
    private final ModelMapper mapper;

    public AcademicYearServiceImpl(AcademicYearRepository repository, ModelMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AcademicYearDto> retrieveAllAcademicYear(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(entity -> mapper.map(entity, AcademicYearDto.class)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AcademicYearDto retrieveById(long id) {
        return mapper.map(find(id), AcademicYearDto.class);
    }

    @Override
    @Transactional
    public AcademicYearDto createAcademicYear(AcademicYearRequest request) {
        AcademicYear entity = mapper.map(request, AcademicYear.class);
        return mapper.map(repository.saveAndFlush(entity), AcademicYearDto.class);
    }

    @Override
    @Transactional
    public AcademicYearDto updateAcademicYear(long id, AcademicYearRequest request) {
        AcademicYear entity = find(id);
        entity.setSchoolId(request.getSchoolId());
        entity.setYearCode(request.getYearCode());
        entity.setStartsOn(request.getStartsOn());
        entity.setEndsOn(request.getEndsOn());
        return mapper.map(repository.saveAndFlush(entity), AcademicYearDto.class);
    }

    @Override
    @Transactional
    public void deleteAcademicYear(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private AcademicYear find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("academic_year id=" + id + " does not exist"));
    }
}