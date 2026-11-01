package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.modelmapper.ModelMapper;
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
    private final ModelMapper mapper;

    public SemesterServiceImpl(SemesterRepository repository, ModelMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SemesterDto> retrieveAllSemester(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(entity -> mapper.map(entity, SemesterDto.class)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SemesterDto retrieveById(long id) {
        return mapper.map(find(id), SemesterDto.class);
    }

    @Override
    @Transactional
    public SemesterDto createSemester(SemesterRequest request) {
        Semester entity = mapper.map(request, Semester.class);
        return mapper.map(repository.saveAndFlush(entity), SemesterDto.class);
    }

    @Override
    @Transactional
    public SemesterDto updateSemester(long id, SemesterRequest request) {
        Semester entity = find(id);
        entity.setAcademicYearId(request.getAcademicYearId());
        entity.setSemesterNo(request.getSemesterNo());
        entity.setStartsOn(request.getStartsOn());
        entity.setEndsOn(request.getEndsOn());
        return mapper.map(repository.saveAndFlush(entity), SemesterDto.class);
    }

    @Override
    @Transactional
    public void deleteSemester(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private Semester find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("semester id=" + id + " does not exist"));
    }
}