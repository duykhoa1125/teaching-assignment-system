package vn.edu.tass.backend.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.tass.backend.entity.TeachingExperience;
import vn.edu.tass.backend.payload.request.TeachingExperienceRequest;
import vn.edu.tass.backend.repository.TeachingExperienceRepository;
import vn.edu.tass.backend.service.TeachingExperienceService;
import vn.edu.tass.backend.service.support.CrudSupport;

@Service
public class TeachingExperienceServiceImpl implements TeachingExperienceService {
    private final CrudSupport<TeachingExperience> crud;

    public TeachingExperienceServiceImpl(TeachingExperienceRepository repository) {
        this.crud = new CrudSupport<>(repository);
    }

    @Transactional(readOnly = true)
    public List<TeachingExperience> list(int limit, int offset) { return crud.list(limit, offset); }

    @Transactional(readOnly = true)
    public TeachingExperience get(long id) { return crud.get(id); }

    @Transactional
    public TeachingExperience create(TeachingExperienceRequest request) { return crud.create(request); }

    @Transactional
    public TeachingExperience replace(long id, TeachingExperienceRequest request) { return crud.replace(id, request); }

    @Transactional
    public void delete(long id) { crud.delete(id); }
}
