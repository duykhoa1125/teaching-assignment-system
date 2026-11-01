package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.School;
import vn.edu.tass.backend.payload.dto.SchoolDto;
import vn.edu.tass.backend.payload.request.SchoolRequest;
import vn.edu.tass.backend.repository.SchoolRepository;
import vn.edu.tass.backend.service.SchoolService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class SchoolServiceImpl implements SchoolService {
    private final SchoolRepository repository;
    private final ModelMapper mapper;

    public SchoolServiceImpl(SchoolRepository repository, ModelMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SchoolDto> retrieveAllSchool(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(entity -> mapper.map(entity, SchoolDto.class)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SchoolDto retrieveById(long id) {
        return mapper.map(find(id), SchoolDto.class);
    }

    @Override
    @Transactional
    public SchoolDto createSchool(SchoolRequest request) {
        School entity = mapper.map(request, School.class);
        return mapper.map(repository.saveAndFlush(entity), SchoolDto.class);
    }

    @Override
    @Transactional
    public SchoolDto updateSchool(long id, SchoolRequest request) {
        School entity = find(id);
        entity.setSchoolCode(request.getSchoolCode());
        entity.setName(request.getName());
        entity.setStatus(request.getStatus());
        return mapper.map(repository.saveAndFlush(entity), SchoolDto.class);
    }

    @Override
    @Transactional
    public void deleteSchool(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private School find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("school id=" + id + " does not exist"));
    }
}