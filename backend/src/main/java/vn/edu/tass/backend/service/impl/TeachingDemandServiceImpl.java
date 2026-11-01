package vn.edu.tass.backend.service.impl;

import java.util.List;
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

    public TeachingDemandServiceImpl(TeachingDemandRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeachingDemandDto> retrieveAllTeachingDemand(int limit, int offset) {
        CrudParameters.requirePage(limit, offset);
        return repository.findAll(new OffsetLimitPageable(limit, offset)).stream()
            .map(this::toDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeachingDemandDto retrieveById(long id) {
        return toDto(find(id));
    }

    @Override
    @Transactional
    public TeachingDemandDto createTeachingDemand(TeachingDemandRequest request) {
        TeachingDemand entity = new TeachingDemand();
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public TeachingDemandDto updateTeachingDemand(long id, TeachingDemandRequest request) {
        TeachingDemand entity = find(id);
        applyRequest(request, entity);
        return toDto(repository.saveAndFlush(entity));
    }

    @Override
    @Transactional
    public void deleteTeachingDemand(long id) {
        repository.delete(find(id));
        repository.flush();
    }

    private TeachingDemandDto toDto(TeachingDemand entity) {
        TeachingDemandDto dto = new TeachingDemandDto();
        dto.setId(entity.getId());
        dto.setSemesterId(entity.getSemesterId());
        dto.setClassId(entity.getClassId());
        dto.setSubjectId(entity.getSubjectId());
        dto.setPeriodsPerWeek(entity.getPeriodsPerWeek());
        dto.setStatus(entity.getStatus());
        dto.setUpdatedBy(entity.getUpdatedBy());
        dto.setUpdatedAt(entity.getUpdatedAt());
        dto.setDemandType(entity.getDemandType());
        return dto;
    }

    private void applyRequest(TeachingDemandRequest request, TeachingDemand entity) {
        entity.setSemesterId(request.getSemesterId());
        entity.setClassId(request.getClassId());
        entity.setSubjectId(request.getSubjectId());
        entity.setPeriodsPerWeek(request.getPeriodsPerWeek());
        entity.setStatus(request.getStatus());
        entity.setUpdatedBy(request.getUpdatedBy());
        entity.setDemandType(request.getDemandType());
    }

    private TeachingDemand find(long id) {
        CrudParameters.requireId(id);
        return repository.findById(id)
            .orElseThrow(() -> new vn.edu.tass.backend.exception.NotFoundException("teaching_demand id=" + id + " does not exist"));
    }
}