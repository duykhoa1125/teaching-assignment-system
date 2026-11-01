package vn.edu.tass.backend.service.impl;

import java.util.List;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.tass.backend.entity.TeachingDemand;
import vn.edu.tass.backend.payload.dto.TeachingDemandDto;
import vn.edu.tass.backend.payload.request.TeachingDemandRequest;
import vn.edu.tass.backend.repository.TeachingDemandRepository;
import vn.edu.tass.backend.service.TeachingDemandService;
import vn.edu.tass.backend.utils.CrudParameters;
import vn.edu.tass.backend.utils.OffsetLimitPageable;

@Service
public class TeachingDemandServiceImpl implements TeachingDemandService {
    private final TeachingDemandRepository repository;
    private final ModelMapper mapper;

    public TeachingDemandServiceImpl(TeachingDemandRepository repository, ModelMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeachingDemandDto> retrieveAllTeachingDemand(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(entity -> mapper.map(entity, TeachingDemandDto.class)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeachingDemandDto retrieveById(long id) {
        return mapper.map(find(id), TeachingDemandDto.class);
    }

    @Override
    @Transactional
    public TeachingDemandDto createTeachingDemand(TeachingDemandRequest request) {
        TeachingDemand entity = mapper.map(request, TeachingDemand.class);
        return mapper.map(repository.saveAndFlush(entity), TeachingDemandDto.class);
    }

    @Override
    @Transactional
    public TeachingDemandDto updateTeachingDemand(long id, TeachingDemandRequest request) {
        TeachingDemand entity = find(id);
        entity.setSemesterId(request.getSemesterId());
        entity.setClassId(request.getClassId());
        entity.setSubjectId(request.getSubjectId());
        entity.setPeriodsPerWeek(request.getPeriodsPerWeek());
        entity.setStatus(request.getStatus());
        entity.setUpdatedBy(request.getUpdatedBy());
        entity.setDemandType(request.getDemandType());
        return mapper.map(repository.saveAndFlush(entity), TeachingDemandDto.class);
    }

    @Override
    @Transactional
    public void deleteTeachingDemand(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private TeachingDemand find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("teaching_demand id=" + id + " does not exist"));
    }
}